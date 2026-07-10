import { AnyNaptrRecord } from "dns";
import RedisHandler from "./redis";
import { generateTradeId } from "./utils";

interface Order {
  orderId: string;
  userID: string;
  price: number;
  quantity: number;
  filled: number;
  status: "open" | "filled" | "cancelled" | "partial";
  side: "buy" | "sell";
}

interface Fills {
  price: number;
  quantity: number;
  userId: string;
  otherUserId: string;
  tradeId: string;
  orderId: string;
  otherOrderId: string;
  otherOrderFilled: number;
  otherOrderStatus: string;
  bucketTime: number;
}

class Orderbook {
  baseAsset: string;
  quoteAsset: string;
  bids: Order[];
  asks: Order[];
  lastTradeId: string;
  currentPrice: number;

  bookWithQuantity: {
    bids: { [price: number]: number };
    asks: { [price: number]: number };
  } = {
    bids: {},
    asks: {},
  };

  constructor(
    baseAsset: string,
    quoteAsset: string,
    bids: Order[],
    asks: Order[],
    lastTradeId: string,
    currentPrice: number
  ) {
    this.baseAsset = baseAsset;
    this.quoteAsset = quoteAsset;
    this.bids = bids;
    this.asks = asks;
    this.lastTradeId = lastTradeId;
    this.currentPrice = currentPrice;
  }

  updateCurrentPrice = (fills: Fills[]) => {
    if (fills.length > 0) {
      this.currentPrice = fills[fills.length - 1].price;
    }
  };

  updateLastTradeId = (fills: Fills[]) => {
    if (fills.length > 0) {
      this.lastTradeId = fills[fills.length - 1].tradeId;
    }
  };

  getBucketTime = () => {
    const tradeTime = new Date().getTime();
    const bucketTime = tradeTime - (tradeTime % 60000);
    return bucketTime;
  };

  getBookWithQuantity = () => {
    return this.bookWithQuantity;
  };

  publishSnapshot = async () => {
    try {
      const market = `${this.baseAsset}_${this.quoteAsset}`;
      const payload = {
        bids: this.bookWithQuantity.bids,
        asks: this.bookWithQuantity.asks,
        currentPrice: this.currentPrice,
      };
      const redis = await RedisHandler.createInstance();
      redis.setBookWithQuantity(payload, market);
    } catch (error) {
      console.error("Failed to push book snapshot to Redis:", error);
    }
  };

  executeSellOrder = (
    user_id: string,
    order_data: {
      order_id: any;
      price?: any;
      quantity?: any;
      side?: any;
      type?: any;
      filled?: any;
      status?: any;
    }
  ) => {
    let {
      order_id,
      price,
      quantity,
      type,
      filled = 0,
      status = "open",
    } = order_data;
    const fills: Fills[] = [];
    let unsold_market_order_quanity;
    const bid_splice_indexes: number[] = [];

    let i = 0;

    for (const [idx, o] of this.bids.entries()) {
      i++;
      if (price <= o.price || type === "market") {
        const fillQuantity = Math.min(quantity - filled, o.quantity - o.filled);
        o.filled += fillQuantity;
        if (o.filled === o.quantity) {
          o.status = "filled";
        } else if (o.filled > 0) {
          o.status = "partial";
        }
        this.bookWithQuantity.bids[o.price] =
          (this.bookWithQuantity.bids[o.price] || 0) - fillQuantity;

        const tradeId = generateTradeId();
        fills.push({
          price: o.price,
          quantity: fillQuantity,
          tradeId,
          userId: user_id,
          otherUserId: o.userID,
          orderId: order_id,
          otherOrderId: o.orderId,
          otherOrderFilled: o.filled,
          otherOrderStatus: o.status,
          bucketTime: this.getBucketTime(),
        });
        filled += fillQuantity;
        if (o.quantity === o.filled) {
          bid_splice_indexes.push(this.bids.indexOf(o));
        }
      }
      if (this.bookWithQuantity.bids[o.price] <= 0) {
        delete this.bookWithQuantity.bids[o.price];
      }
      if (filled === quantity) {
        status = "filled";
        break;
      }
    }

    if (type == "limit") {
      const odr: Order = {
        price,
        quantity,
        filled,
        status,
        orderId: order_id,
        side: "sell",
        userID: user_id,
      };
      if (filled === 0) {
        odr.status = "open";
      } else if (filled > 0 && filled < quantity) {
        odr.status = "partial";
      }

      const index = this.asks.findIndex((el: Order) => el.price > odr.price);

      if (index === -1) {
        this.asks.push(odr);
      } else {
        this.asks.splice(index, 0, odr);
      }

      this.bookWithQuantity.asks[price] =
        (this.bookWithQuantity.asks[price] || 0) + quantity - filled;
    } else if (quantity != 0 && type == "market") {
      unsold_market_order_quanity = quantity - filled;
    }
    this.bids = this.bids.filter((_, idx) => !bid_splice_indexes.includes(idx));
    return { order_id, fills, status, filled, unsold_market_order_quanity };
  };

  executeBuyOrder = (
    user_id: string,
    order_data: {
      order_id: any;
      price?: any;
      quantity?: any;
      side?: any;
      type?: any;
      filled?: number;
      status?: any;
    }
  ) => {
    let { order_id, price, quantity, type, filled = 0, status } = order_data;

    const fills: Fills[] = [];
    let unused_market_order_amount;
    const ask_splice_indexes: number[] = [];

    let i = 0;

    for (const [idx, o] of this.asks.entries()) {
      if (type == "market") {
        const affordableBase = price / o.price;
        const availableBase = o.quantity - o.filled;
        const fillQuantity = Math.min(affordableBase, availableBase);

        if (fillQuantity <= 0) break;

        o.filled += fillQuantity;
        if (o.filled === o.quantity) {
          o.status = "filled";
        } else if (o.filled > 0) {
          o.status = "partial";
        }
        this.bookWithQuantity.asks[o.price] =
          (this.bookWithQuantity.asks[o.price] || 0) - fillQuantity;

        const tradeId = generateTradeId();
        fills.push({
          price: o.price,
          quantity: fillQuantity,
          tradeId,
          userId: user_id,
          otherUserId: o.userID,
          orderId: order_id,
          otherOrderId: o.orderId,
          otherOrderFilled: o.filled,
          otherOrderStatus: o.status,
          bucketTime: this.getBucketTime(),
        });

        filled += fillQuantity;
        price -= fillQuantity * o.price;

        if (o.quantity === o.filled) {
          ask_splice_indexes.push(this.asks.indexOf(o));
        }
      }

      if (price >= o.price && type == "limit") {
        const fillQuantity = Math.min(quantity - filled, o.quantity - o.filled);
        o.filled += fillQuantity;
        if (o.filled === o.quantity) {
          o.status = "filled";
        } else if (o.filled > 0) {
          o.status = "partial";
        }

        this.bookWithQuantity.asks[o.price] =
          (this.bookWithQuantity.asks[o.price] || 0) - fillQuantity;
        const tradeId = generateTradeId();

        fills.push({
          price: o.price,
          quantity: fillQuantity,
          tradeId,
          userId: user_id,
          otherUserId: o.userID,
          orderId: order_id,
          otherOrderId: o.orderId,
          otherOrderFilled: o.filled,
          otherOrderStatus: o.status,
          bucketTime: this.getBucketTime(),
        });
        filled += fillQuantity;

        if (o.quantity === o.filled) {
          ask_splice_indexes.push(this.asks.indexOf(o));
        }
      }

      if (this.bookWithQuantity.asks[o.price] <= 0) {
        delete this.bookWithQuantity.asks[o.price];
      }

      if (quantity === filled) {
        status = "filled";
        break;
      }

      if (type === "market" && price <= 0) {
        status = "filled";
        break;
      } else if (type === "limit" && quantity === filled) {
        status = "filled";
        break;
      }
    }

    if (quantity != filled && type === "limit") {
      //Insert order in sorted format
      const odr: Order = {
        price,
        quantity,
        orderId: order_id,
        side: "buy",
        filled,
        status: "partial",
        userID: user_id,
      };
      if (filled === 0) {
        odr.status = "open";
      } else if (filled > 0 && filled < quantity) {
        odr.status = "partial";
      }
      const index = this.bids.findIndex((el: Order) => el.price < odr.price);
      if (index === -1) {
        this.bids.push(odr);
      } else {
        this.bids.splice(index, 0, odr);
      }

      this.bookWithQuantity.bids[price] =
        (this.bookWithQuantity.bids[price] || 0) + quantity - filled;
    }
    if (price != 0 && type === "market") {
      unused_market_order_amount = price;
    }
    this.asks = this.asks.filter((_, idx) => !ask_splice_indexes.includes(idx));
    return { order_id, fills, status, filled, unused_market_order_amount };
  };

  placeOrder = (
    user_id: string,
    order_data: { order_id: any; price?: any; quantity?: any; side?: any }
  ) => {
    console.log("\n Book with Quantity", this.bookWithQuantity);
    if (order_data.side == "sell") {
      const { order_id, fills, status, filled, unsold_market_order_quanity } =
        this.executeSellOrder(user_id, order_data);
      console.log(
        "\n Book with Quantity buy============",
        this.bookWithQuantity
      );
      console.log(
        "\n Bids-----------",
        this.bids,
        "\n Asks++++++++++++",
        this.asks
      );
      this.updateCurrentPrice(fills);
      this.updateLastTradeId(fills);
      return { order_id, fills, status, filled, unsold_market_order_quanity };
    } else if (order_data.side == "buy") {
      const { order_id, fills, status, filled, unused_market_order_amount } =
        this.executeBuyOrder(user_id, order_data);
      console.log(
        "\n Book with Quantity buy============",
        this.bookWithQuantity
      );
      console.log(
        "\n Bids-----------",
        this.bids,
        "\n Asks++++++++++++",
        this.asks
      );
      this.updateCurrentPrice(fills);
      this.updateLastTradeId(fills);
      return { order_id, fills, status, filled, unused_market_order_amount };
    } else {
      throw new Error(`Invalid order side provided: ${order_data.side}`);
    }
  };

  cancelOrder = (order_data: { order_id: string }) => {
    //Loop through both the bids and asks array
    //collect indexes of matches wrt order_id
    //In this same iteration reduce amounts from bookWithQuantity object
    //use the previous index array to filter from orderbook

    const asks_array_index: number[] = [];
    const bids_array_index: number[] = [];
    this.asks.forEach((o) => {
      if (o.orderId == order_data.order_id) {
        asks_array_index.push(this.asks.indexOf(o));
        this.bookWithQuantity.asks[o.price] -= o.quantity;
      }
    });
    this.bids.forEach((o) => {
      if (o.orderId == order_data.order_id) {
        bids_array_index.push(this.bids.indexOf(o));
        this.bookWithQuantity.bids[o.price] -= o.quantity;
      }
    });

    this.bids = this.bids.filter((_, idx) => !bids_array_index.includes(idx));
    this.asks = this.asks.filter((_, idx) => !asks_array_index.includes(idx));

    console.log(asks_array_index, "asks_array_index order");
    console.log(bids_array_index, "bids_array_index order");
    console.log(this.bookWithQuantity, "bookWithQuantity order");
    return { order_id: order_data.order_id };
  };
}

export { Fills, Orderbook };
