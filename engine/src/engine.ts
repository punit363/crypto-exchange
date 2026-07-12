import fs from "fs";
import { Orderbook, Fills } from "./orderbook";
import RedisHandler from "./redis";
import { generateCandleId } from "./utils";

const SCALE = 100_000_000;
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
        available: 10000000000000,
        locked: 0,
      },
      BTC: {
        available: 1000000000000,
        locked: 0,
      },
    },
  ],
  [
    "usr_xslwr9hnet",
    {
      INR: {
        available: 20000000000000,
        locked: 0,
      },
      BTC: {
        available: 2000000000000,
        locked: 0,
      },
    },
  ],
];

let balance = new Map<string, UserBalance>(balance_arr);

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
    throw new Error(
      `CRITICAL: Balance ledger completely missing for user: ${user_id}`
    );
  }

  if (side == "buy") {
    if (!userBalance[quoteAsset])
      throw new Error(
        `CRITICAL: ${quoteAsset} ledger missing for user: ${user_id}`
      );

    const quoteValue = Math.floor((quantity * price) / SCALE);

    if (userBalance[quoteAsset].available < quoteValue) {
      throw new Error("Insufficient balance for buy order");
    }

    userBalance[quoteAsset].available -= quoteValue;
    userBalance[quoteAsset].locked += quoteValue;
  } else if (side == "sell") {
    if (!userBalance[baseAsset])
      throw new Error(
        `CRITICAL: ${baseAsset} ledger missing for user: ${user_id}`
      );

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
      if (
        !userBalance[baseAsset] ||
        !userBalance[quoteAsset] ||
        !otherUserBalance[baseAsset] ||
        !otherUserBalance[quoteAsset]
      ) {
        throw new Error(
          `Specific asset ledger missing during settleBalanceAfterTrade`
        );
      }

      const quoteValue = Math.floor((fill.quantity * fill.price) / SCALE);

      userBalance[baseAsset].locked -= fill.quantity;
      userBalance[quoteAsset].available += quoteValue;

      otherUserBalance[quoteAsset].locked -= quoteValue;
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
      if (
        !userBalance[baseAsset] ||
        !userBalance[quoteAsset] ||
        !otherUserBalance[baseAsset] ||
        !otherUserBalance[quoteAsset]
      ) {
        throw new Error(
          `Specific asset ledger missing during settleBalanceAfterTrade`
        );
      }

      const quoteValue = Math.floor((fill.quantity * fill.price) / SCALE);

      userBalance[quoteAsset].locked -= quoteValue;
      userBalance[baseAsset].available += fill.quantity;

      otherUserBalance[baseAsset].locked -= fill.quantity;
      otherUserBalance[quoteAsset].available += quoteValue;
    }
  } else {
    throw new Error("Order side must be buy or sell");
  }
};

const settleBalanceAfterTradeCancellation = (
  userId: string,
  quantity: number,
  filled: number,
  price: number,
  side: string,
  quoteAsset: string,
  baseAsset: string
) => {
  const userBalance = balance.get(userId);

  if (!userBalance) {
    throw new Error(`Balance missing for user: ${JSON.stringify(userId)}`);
  }
  //TODO: handle this case properly-- incase the balance does not exist how did a trade occur?
  const remainingQty = quantity - filled;

  if (side === "sell") {
    if (!userBalance[baseAsset])
      throw new Error(
        `CRITICAL: ${baseAsset} ledger missing for user: ${userId}`
      );
    userBalance[baseAsset].locked -= remainingQty;
    userBalance[baseAsset].available += remainingQty;
  } else if (side === "buy") {
    if (!userBalance[quoteAsset])
      throw new Error(
        `CRITICAL: ${quoteAsset} ledger missing for user: ${userId}`
      );

    const remainingQuoteValue = Math.floor((remainingQty * price) / SCALE);

    userBalance[quoteAsset].locked -= remainingQuoteValue;
    userBalance[quoteAsset].available += remainingQuoteValue;
  } else {
    throw new Error("Order side must be buy or sell");
  }
};

type Candle = {
  bucket_time: number;
  quote_asset: string;
  base_asset: string;
  open: number;
  close: number;
  high: number;
  low: number;
  vol: number;
};

const activeCandles = new Map<string, Candle>();

const addCandlesToDB = async (
  fills: Fills[],
  baseAsset: string,
  quoteAsset: string
) => {
  const market = `${baseAsset}_${quoteAsset}`;
  let currentCandle = activeCandles.get(market);

  for (const fill of fills) {
    if (!currentCandle || currentCandle.bucket_time < fill.bucketTime) {
      if (currentCandle) {
        const redis = await RedisHandler.createInstance();
        await redis.sendToDB({
          action: "ADD_CANDLE",
          candle: {
            candle_id: generateCandleId(),
            interval: "1m",
            base_asset: baseAsset,
            quote_asset: quoteAsset,
            open: currentCandle.open,
            high: currentCandle.high,
            low: currentCandle.low,
            close: currentCandle.close,
            volume: currentCandle.vol,
          },
        });
      }
      currentCandle = {
        bucket_time: fill.bucketTime,
        quote_asset: quoteAsset,
        base_asset: baseAsset,
        open: fill.price,
        close: fill.price,
        high: fill.price,
        low: fill.price,
        vol: fill.quantity,
      };
    } else {
      currentCandle.low = Math.min(currentCandle.low, fill.price);
      currentCandle.high = Math.max(currentCandle.high, fill.price);
      currentCandle.close = fill.price;
      currentCandle.vol += fill.quantity;
    }
    activeCandles.set(market, currentCandle);
  }
};

type Transaction = {
  tx_id: string;
  user_id: string;
  asset: string;
  type: string;
  amount: number;
};

const addTransactionInDB = async (transaction: Transaction) => {
  console.log("send to db============", transaction);
  const redis = await RedisHandler.createInstance();
  await redis.sendToDB({
    action: "ADD_TRANSACTION",
    transaction,
  });
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

  processOrder = async (
    order: {
      action: string;
      user_id: string;
      order_data: {
        order_id?: any;
        price?: any;
        quantity?: any;
        side?: any;
        type?: any;
        baseAsset?: any;
        quoteAsset?: any;
      };
    },
    engine_request_id: string
  ) => {
    switch (order.action) {
      case "PLACE_ORDER": {
        const redis = await RedisHandler.createInstance();
        try {
          const orderbook = this.orderbooks.find(
            (o) => o.baseAsset === order.order_data.baseAsset
          );

          if (!orderbook) {
            throw new Error("No orderbook found");
          }

          const { price, quantity, side, type, baseAsset, quoteAsset } =
            order.order_data;

          console.log("step------------=========", order.order_data);
          checkAndLockBalance(
            order.user_id,
            quantity,
            price,
            side,
            quoteAsset,
            baseAsset
          );
          console.log("0---------------------");
          const {
            status: orderStatus,
            odb_status_code,
            message,
            data,
          } = orderbook.placeOrder(order.user_id, order.order_data);

          if(!data) {
            await redis.sendApiResponse(
              {
                eng_status_code: odb_status_code,
                status: orderStatus,
                message,
                data: null,
              },
              engine_request_id
            );
            break;
          }
          const {
            order_id,
            fills,
            status,
            filled,
            unsold_market_order_quanity = null,
            unused_market_order_amount = null,
          } = data;

          console.log("1---------------------");
          settleBalanceAfterTrade(
            fills,
            order.order_data.side,
            order.order_data.quoteAsset,
            order.order_data.baseAsset
          );
          console.log("2---------------------");
          console.log("3---------------------");
          const response = {
            order_id,
            fills,
            unsold_market_order_quanity,
            unused_market_order_amount,
          };
          await redis.sendApiResponse(
            {
              eng_status_code: odb_status_code,
              status: orderStatus,
              message,
              data: response,
            },
            engine_request_id
          );
          console.log("4---------------------");

          const trade_publish_data = {
            market: `${baseAsset}_${quoteAsset}`,
            trade: fills,
          };
          const book_with_quantity_publish_data = {
            market: `${baseAsset}_${quoteAsset}`,
            book: orderbook.getBookWithQuantity(),
          };

          await redis.publishTrade(trade_publish_data);
          console.log("5---------------------");

          await redis.publishOrderBookWithQuantity(
            book_with_quantity_publish_data
          );
          console.log("6---------------------");

          orderbook.publishSnapshot();
          console.log("7---------------------");

          await redis.sendToDB({
            action: "ADD_ORDER",
            order: {
              order_id,
              user_id: order.user_id,
              side,
              type,
              quantity,
              filled_quantity: filled,
              price,
              status,
              base_asset: baseAsset,
              quote_asset: quoteAsset,
            },
          });
          console.log("8---------------------");

          if (fills.length > 0) {
            addCandlesToDB(fills, baseAsset, quoteAsset);
            console.log("9---------------------");

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
            const update_order = fills.map((fill) => ({
              order_id: fill.otherOrderId,
              filled: fill.otherOrderFilled,
              status: fill.otherOrderStatus,
            }));
            await redis.sendToDB({
              action: "UPDATE_ORDERS",
              update_order,
            });
            console.log("10---------------------");
          }
        } catch (error: any) {
          console.error(
            "Engine ORDER_PROCESSING_ERROR Intercepted: ",
            error.message
          );
          // Return standardized API error response cleanly over Redis instead of crashing
          await redis.sendApiResponse(
            {
              eng_status_code: 0,
              status: "FAILED",
              message:
                error.message ||
                "An unexpected error occurred during trade execution.",
            },
            engine_request_id
          );
        }
        break;
      }
      case "CANCEL_ORDER": {
        const redis = await RedisHandler.createInstance();
        try {
          const user_id = order.user_id;
          const { order_id, baseAsset, quoteAsset, side } = order.order_data;

          const orderbook = this.orderbooks.find(
            (o) => o.baseAsset === baseAsset
          );
          console.log("====================", order.order_data);

          if (!orderbook) {
            throw new Error(`No orderbook found for base asset: ${baseAsset}`);
          }

          const odb_response = orderbook.cancelOrder(user_id, order_id, side);

          //update balance
          if (odb_response.data) {
            odb_response.data.status = "cancelled";

            settleBalanceAfterTradeCancellation(
              user_id,
              odb_response.data.quantity,
              odb_response.data.filled,
              odb_response.data.price,
              odb_response.data.side,
              quoteAsset,
              baseAsset
            );

            const cancel_order = {
              order_id,
              status: odb_response.data.status,
            };

            console.log("cancel data", cancel_order);
            await redis.sendToDB({
              action: "CANCEL_ORDER",
              cancel_order,
            });

            orderbook.publishSnapshot();
            await redis.sendApiResponse(
              {
                eng_status_code: 1,
                status: "SUCCESS",
                message: "Order was cancelled successfully",
                data: odb_response.data,
              },
              engine_request_id
            );
          } else {
            await redis.sendApiResponse(
              {
                eng_status_code: odb_response.odb_status_code,
                status: odb_response.status,
                message: odb_response.message,
                data: odb_response.data,
              },
              engine_request_id
            );
          }
          console.log("====================", odb_response);
        } catch (error: any) {
          console.error(
            "Engine CANCEL_ORDER_ERROR Intercepted: ",
            error.message
          );
          await redis.sendApiResponse(
            {
              eng_status_code: 0,
              status: "FAILED",
              message:
                error.message ||
                "An unexpected error occurred during order cancellation.",
            },
            engine_request_id
          );
        }
        break;
      }
      case "FETCH_OPEN_ORDERS": {
        const redis = await RedisHandler.createInstance();
        try {
          const user_id = order.user_id;
          const { baseAsset, quoteAsset } = order.order_data;

          const orderbook = this.orderbooks.find(
            (o) => o.baseAsset === baseAsset
          );
          console.log("====================fetch", order.order_data);

          if (!orderbook) {
            throw new Error("No orderbook found");
          }

          const response = orderbook.fetchOpenOrders();

          const redis = await RedisHandler.createInstance();

          await redis.sendApiResponse(
            {
              eng_status_code: 1,
              status: "SUCCESS",
              message: "Open Orders were fetched successfully",
              data: response,
            },
            engine_request_id
          );
          console.log("====================fetch", response);
        } catch (error: any) {
          console.error(
            "Engine FETCH_OPEN_ORDERS_ERROR Intercepted: ",
            error.message
          );
          await redis.sendApiResponse(
            {
              eng_status_code: 0,
              status: "FAILED",
              message:
                error.message ||
                "An unexpected error occurred during order fetch",
            },
            engine_request_id
          );
        }
        break;
      }
    }
  };

  processBalanceUpdate = async (
    transaction: {
      tx_id: string;
      user_id: string;
      asset: string;
      type: string;
      amount: number;
    },
    engine_request_id: string
  ) => {
    const redis = await RedisHandler.createInstance();
    try {
      const { tx_id, user_id, asset, type, amount } = transaction;

      const user_balance: UserBalance | any = balance.get(user_id);
      let message, status;

      console.log("transaction started-------------", transaction);
      console.log("user balance found-------------", user_balance);

      if (user_balance && type === "deposit") {
        status = "SUCCESS";
        user_balance[asset].available += amount;
        console.log(
          "deosit started-------------",
          user_balance[asset].available
        );

        await addTransactionInDB({
          tx_id,
          user_id,
          asset,
          type,
          amount,
        });
      } else if (user_balance && type === "withdraw") {
        if (user_balance[asset].available < amount) {
          message = "You do not have sufficient balance";
          status = "FAILED";
        } else {
          user_balance[asset].available -= amount;
          status = "SUCCESS";
          await addTransactionInDB({
            tx_id,
            user_id,
            asset,
            type,
            amount,
          });
        }
        console.log(
          "withdrawal started-------------",
          user_balance[asset].available
        );
      } else {
        status = "FAILED";
        message = "Invalid transaction type or user balance does not exist";
      }
      balance.set(user_id, user_balance);
      console.log("return===========", {
        current_balance: user_balance,
        message,
        status,
      });

      const redis = await RedisHandler.createInstance();
      await redis.sendApiResponse(
        {
          current_balance: user_balance,
          message,
          status,
        },
        engine_request_id
      );
    } catch (error: any) {
      console.error("Engine BALANCE_UPDATE_ERROR Intercepted: ", error.message);

      // Clean error dispatch so the API layer never hangs
      await redis.sendApiResponse(
        {
          eng_status_code: 0,
          status: "FAILED",
          message:
            error.message ||
            "An unexpected error occurred during balance adjustments.",
        },
        engine_request_id
      );
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
