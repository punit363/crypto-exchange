import fs from "fs";
import { Orderbook, Fills } from "./orderbook";
import RedisHandler from "./redis";
import { snapshot } from "node:test";

interface UserBalance {
  [key: string]: {
    available: number;
    locked: number;
  };
}

//baseAsset : BTC, quoteAsset : INR

const balance_arr: [string, UserBalance][] = [
  [
    "usr_6q9g3syt014",
    {
      INR: {
        available: 100000,
        locked: 0,
      },
      BTC: {
        available: 10000,
        locked: 0,
      },
    },
  ],
  [
    "usr_xslwr9hnet",
    {
      INR: {
        available: 200000,
        locked: 0,
      },
      BTC: {
        available: 20000,
        locked: 0,
      },
    },
  ],
];

let balance = new Map<string, UserBalance>(balance_arr);

const checkUserBalance = (user_id: any) => {
  const user_balance = balance.get(user_id);
  if (!user_balance) {
    balance.set(user_id, {
      INR: {
        available: 0,
        locked: 0,
      },
      BTC: {
        available: 0,
        locked: 0,
      },
    });
    return { message: "balance does not exist" };
  }
  return user_balance;
};

const checkAndLockBalance = (
  user_id: any,
  quantity: number,
  price: number,
  side: string,
  quoteAsset: string,
  baseAsset: string
) => {
  const userBalance = balance.get(user_id);
  if (!userBalance) {
    return { message: "Balance does not exist. Register user first" };
  }

  if (side == "buy") {
    if (userBalance[quoteAsset].available < quantity * price) {
      throw new Error("Insufficient balance for buy order");
    }

    userBalance[quoteAsset].available -= quantity * price;
    userBalance[quoteAsset].locked += quantity * price;
  } else if (side == "sell") {
    if (userBalance[baseAsset].available < quantity) {
      throw new Error("Insufficient balance for sell order");
    }

    userBalance[baseAsset].available -= quantity;
    userBalance[baseAsset].locked += quantity;
  }
};

const settleBalanceAfterTrade = (
  fills: Fills[],
  side: string,
  quoteAsset: string,
  baseAsset: string
) => {
  if (side === "sell") {
    for (const fill of fills) {
      const userBalance = balance.get(fill.userId);
      const otherUserBalance = balance.get(fill.otherUserId);
      //TODO: handle this case properly-- incase the balance does not exist how did a trade occur?

      if (!userBalance || !otherUserBalance) {
        throw new Error(`Balance missing for fill: ${JSON.stringify(fill)}`);
      }

      userBalance[baseAsset].locked -= fill.quantity;
      userBalance[quoteAsset].available += fill.quantity * fill.price;

      otherUserBalance[quoteAsset].locked -= fill.quantity * fill.price;
      otherUserBalance[baseAsset].available += fill.quantity;
    }
  } else if (side === "buy") {
    for (const fill of fills) {
      const userBalance = balance.get(fill.userId);
      const otherUserBalance = balance.get(fill.otherUserId);
      //TODO: handle this case properly-- incase the balance does not exist how did a trade occur?

      if (!userBalance || !otherUserBalance) {
        throw new Error(`Balance missing for fill: ${JSON.stringify(fill)}`);
      }

      userBalance[quoteAsset].locked -= fill.quantity * fill.price;
      userBalance[baseAsset].available += fill.quantity;

      otherUserBalance[baseAsset].locked -= fill.quantity;
      otherUserBalance[quoteAsset].available += fill.quantity * fill.price;
    }
    return "available and locked";
  } else {
    throw new Error("Order side must be buy or sell");
  }
};

class Engine {
  orderbooks: Orderbook[] = [];

  constructor() {
    try {
      const snapshot = fs.readFileSync("./snapshot.json", "utf-8");
      const parsed = JSON.parse(snapshot);

      this.orderbooks = parsed.orderbooks.map(
        (ob: any) =>
          new Orderbook(
            ob.baseAsset,
            ob.quoteAsset,
            ob.bids,
            ob.asks,
            ob.lastTradeId,
            ob.currentPrice
          )
      );

      balance = new Map<string, UserBalance>(parsed.balances);
    } catch {
      // No snapshot found, start fresh
      this.orderbooks = [new Orderbook("BTC", "INR", [], [], "", 0)];
      console.log("No snapshot found, starting fresh");
    }

    setInterval(() => {
      const currentSnapshot = {
        orderbooks: this.orderbooks.map((ob) => ({
          baseAsset: ob.baseAsset,
          quoteAsset: ob.quoteAsset,
          bids: ob.bids,
          asks: ob.asks,
          lastTradeId: ob.lastTradeId,
          currentPrice: ob.currentPrice,
        })),
        balances: Array.from(balance.entries()),
      };

      fs.writeFileSync("./snapshot.json", JSON.stringify(currentSnapshot));
    }, 1000 * 3);
  }

  processOrder = async (order: {
    action: string;
    user_id: string;
    order_data: {
      order_id: any;
      price?: any;
      quantity?: any;
      side?: any;
      type?: any;
      baseAsset?: any;
      quoteAsset?: any;
    };
  }) => {
    switch (order.action) {
      case "PLACE_ORDER": {
        const orderbook = this.orderbooks.find(
          (o) => o.baseAsset === order.order_data.baseAsset
        );

        if (!orderbook) {
          throw new Error("No orderbook found");
        }

        const { price, quantity, side, type, baseAsset, quoteAsset } =
          order.order_data;

        checkAndLockBalance(
          order.user_id,
          quantity,
          price,
          side,
          quoteAsset,
          baseAsset
        );

        const {
          order_id,
          fills,
          unsold_market_order_quanity = null,
          unused_market_order_amount = null,
        } = orderbook.placeOrder(order.user_id, order.order_data);

        settleBalanceAfterTrade(
          fills,
          order.order_data.side,
          order.order_data.quoteAsset,
          order.order_data.baseAsset
        );

        const redis = await RedisHandler.createInstance();
        await redis.sendOrderResponse({
          order_id,
          fills,
          unsold_market_order_quanity,
          unused_market_order_amount,
        });
        await redis.publishTrade(fills);

        await redis.sendToDB({
          action: "ADD_ORDER",
          order: {
            order_id,
            user_id: order.user_id,
            side,
            type,
            quantity,
            filled_quantity: 0,
            price,
            status: "open",
            base_asset: baseAsset,
            quote_asset: quoteAsset,
          },
        });

        if (fills.length > 0) {
          const trades = fills.map((fill) => ({
            trade_id: fill.tradeId,
            user_id: fill.userId,
            other_user_id: fill.otherUserId,
            order_id: fill.orderId,
            other_order_id: fill.otherOrderId,
            price: fill.price,
            quantity: fill.quantity,
            base_asset: baseAsset,
            quote_asset: quoteAsset,
            side,
          }));

          await redis.sendToDB({
            action: "ADD_TRADES",
            trades,
          });
        }
        break;
      }
      case "CANCEL_ORDER": {
        const orderbook = this.orderbooks.find(
          (o) => o.baseAsset === order.order_data.baseAsset
        );

        if (!orderbook) {
          throw new Error("No orderbook found");
        }
        const { order_id } = orderbook.cancelOrder(order.order_data);

        const redis1 = await RedisHandler.createInstance();
        await redis1.sendOrderResponse({
          order_id,
          message: "Order cancelled successfully",
        });
        break;
      }
    }
  };
}

// const engine = async (order: {
//   action: string;
//   order_data: { order_id: any; price?: any; quantity?: any; side?: any };
// }) => {

//   console.log(order, "engine order inside 1");
//   switch (order.action) {
//     case "PLACE_ORDER":
//       let { order_id, price, quantity, side } = order.order_data;

//       console.log(order, "engine order inside 2");

//       const fills: Fills[] = [];

//       const ask_splice_indexes: number[] = [];
//       const bid_splice_indexes: number[] = [];

//       const tradeId = "#5234";
//       let i = 0;
//       if (side == "sell") {
//         orderbook.bids.forEach((o: Bid) => {
//           i++;
//           if (price <= o.price) {
//             const fillQuantity = Math.min(quantity, o.quantity);
//             o.quantity -= fillQuantity;
//             bookWithQuantity.bids[o.price] =
//               (bookWithQuantity.bids[o.price] || 0) - fillQuantity;
//             fills.push({ price: o.price, quantity: fillQuantity, tradeId });
//             quantity -= fillQuantity;
//             if (o.quantity === 0) {
//               bid_splice_indexes.push(orderbook.bids.indexOf(o));
//             }
//           }
//           if (bookWithQuantity.bids[o.price] === 0) {
//             delete bookWithQuantity.bids[o.price];
//           }
//         });

//         if (quantity != 0) {
//           //Insert order in sorted format
//           const odr: Ask = { price, quantity, orderId: order_id, side: "ask" };
//           const index = orderbook.asks.findIndex(
//             (el: Ask) => el.price > odr.price
//           );

//           if (index === -1) {
//             orderbook.asks.push(odr);
//           } else {
//             orderbook.asks.splice(index, 0, odr);
//           }

//           bookWithQuantity.asks[price] =
//             (bookWithQuantity.asks[price] || 0) + quantity;
//         }
//       }

//       if (side == "buy") {
//         orderbook.asks.forEach((o: Ask) => {
//           if (price >= o.price) {
//             const fillQuantity = Math.min(quantity, o.quantity);
//             o.quantity -= fillQuantity;
//             bookWithQuantity.asks[o.price] =
//               (bookWithQuantity.asks[o.price] || 0) - fillQuantity;

//             fills.push({ price: o.price, quantity: fillQuantity, tradeId });
//             quantity -= fillQuantity;

//             if (o.quantity === 0) {
//               ask_splice_indexes.push(orderbook.asks.indexOf(o));
//             }
//           }

//           if (bookWithQuantity.asks[o.price] === 0) {
//             delete bookWithQuantity.asks[o.price];
//           }
//         });

//         if (quantity != 0) {
//           //Insert order in sorted format
//           const odr: Bid = { price, quantity, orderId: order_id, side: "bid" };
//           const index = orderbook.bids.findIndex(
//             (el: Bid) => el.price > odr.price
//           );

//           if (index === -1) {
//             orderbook.bids.push(odr);
//           } else {
//             orderbook.bids.splice(index, 0, odr);
//           }

//           bookWithQuantity.bids[price] =
//             (bookWithQuantity.bids[price] || 0) + quantity;
//         }
//       }

//       orderbook.bids = orderbook.bids.filter(
//         (_, idx) => !bid_splice_indexes.includes(idx)
//       );
//       orderbook.asks = orderbook.asks.filter(
//         (_, idx) => !ask_splice_indexes.includes(idx)
//       );
//       console.log(orderbook, "++++++++");
//       console.log(bookWithQuantity, "--------");
//       const redis = await RedisHandler.createInstance();
//       await redis.sendOrderResponse({ order_id, fills });
//       await redis.publishTrade(fills);
//       await redis.sendTradeToDB(fills);

//       //TODO: so it will basically never send it unless the first fill // BAD //
//       if (fills.length != 0) {
//         await redis.publishOrderBookWithQuantity(bookWithQuantity);
//       }
//       break;

//     case "CANCEL_ORDER":
//       //Loop through both the bids and asks array
//       //collect indexes of matches wrt order_id
//       //In this same iteration reduce amounts from bookWithQuantity object
//       //use the previous index array to filter from orderbook
//       //
//       console.log(order, "engine order");
//       const asks_array_index: number[] = [];
//       const bids_array_index: number[] = [];
//       orderbook.asks.forEach((o) => {
//         if (o.orderId == order.order_data.order_id) {
//           asks_array_index.push(orderbook.asks.indexOf(o));
//           bookWithQuantity.asks[o.price] -= o.quantity;
//         }
//       });
//       orderbook.bids.forEach((o) => {
//         if (o.orderId == order.order_data.order_id) {
//           bids_array_index.push(orderbook.bids.indexOf(o));
//           bookWithQuantity.bids[o.price] -= o.quantity;
//         }
//       });

//       orderbook.bids = orderbook.bids.filter(
//         (_, idx) => !bids_array_index.includes(idx)
//       );
//       orderbook.asks = orderbook.asks.filter(
//         (_, idx) => !asks_array_index.includes(idx)
//       );

//       console.log(asks_array_index, "asks_array_index order");
//       console.log(bids_array_index, "bids_array_index order");
//       console.log(orderbook, "orderbook order");
//       console.log(bookWithQuantity, "bookWithQuantity order");

//       const redis1 = await RedisHandler.createInstance();
//       await redis1.sendOrderResponse({
//         order_id: order.order_data.order_id,
//         message: "Order cancelled successfully",
//       });
//       break;
//   }
// };

export default Engine;
