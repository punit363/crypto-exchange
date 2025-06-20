
interface Order {
  orderId: string;
  userID: string;
  price: number;
  quantity: number;
  side: "buy" | "sell";
}

// interface Orderbook {
//   baseAsset: string;
//   quoteAsset: string;
//   bids: Order[];
//   asks: Order[];
// }

const bookWithQuantity: {
  bids: { [price: number]: number };
  asks: { [price: number]: number };
} = {
  bids: {},
  asks: {},
};

interface Fills {
  price: number;
  quantity: number;
  userId: string;
  otherUserId: string;
  tradeId: string;
}

export class Orderbook {
  baseAsset: string;
  quoteAsset: string;
  bids: Order[];
  asks: Order[];

  constructor(
    baseAsset: string,
    quoteAsset: string,
    bids: Order[],
    asks: Order[]
  ) {
    this.baseAsset = baseAsset;
    this.quoteAsset = quoteAsset;
    this.bids = bids;
    this.asks = asks;
  }

  placeOrder = async (
    user_id: string,
    order_data: { order_id: any; price?: any; quantity?: any; side?: any }
  ) => {
    let { order_id, price, quantity, side } = order_data;

    console.log(order_data, "engine order inside 2");
    console.log(user_id, "engine order inside 2");

    const fills: Fills[] = [];

    const ask_splice_indexes: number[] = [];
    const bid_splice_indexes: number[] = [];

    const tradeId = "#5234";
    let i = 0;
    if (side == "sell") {
      this.bids.forEach((o: Order) => {
        i++;
        if (price <= o.price) {
          const fillQuantity = Math.min(quantity, o.quantity);
          o.quantity -= fillQuantity;
          bookWithQuantity.bids[o.price] =
            (bookWithQuantity.bids[o.price] || 0) - fillQuantity;
          fills.push({
            price: o.price,
            quantity: fillQuantity,
            tradeId,
            userId: user_id,
            otherUserId: o.userID,
          });
          quantity -= fillQuantity;
          if (o.quantity === 0) {
            bid_splice_indexes.push(this.bids.indexOf(o));
          }
        }
        if (bookWithQuantity.bids[o.price] === 0) {
          delete bookWithQuantity.bids[o.price];
        }
      });

      if (quantity != 0) {
        //Insert order in sorted format
        const odr: Order = {
          price,
          quantity,
          orderId: order_id,
          side: "sell",
          userID: user_id,
        };
        const index = this.asks.findIndex((el: Order) => el.price > odr.price);

        if (index === -1) {
          this.asks.push(odr);
        } else {
          this.asks.splice(index, 0, odr);
        }

        bookWithQuantity.asks[price] =
          (bookWithQuantity.asks[price] || 0) + quantity;
      }
    }

    if (side == "buy") {
      this.asks.forEach((o: Order) => {
        if (price >= o.price) {
          const fillQuantity = Math.min(quantity, o.quantity);
          o.quantity -= fillQuantity;
          bookWithQuantity.asks[o.price] =
            (bookWithQuantity.asks[o.price] || 0) - fillQuantity;

          fills.push({
            price: o.price,
            quantity: fillQuantity,
            tradeId,
            userId: user_id,
            otherUserId: o.userID,
          });
          quantity -= fillQuantity;

          if (o.quantity === 0) {
            ask_splice_indexes.push(this.asks.indexOf(o));
          }
        }

        if (bookWithQuantity.asks[o.price] === 0) {
          delete bookWithQuantity.asks[o.price];
        }
      });

      if (quantity != 0) {
        //Insert order in sorted format
        const odr: Order = {
          price,
          quantity,
          orderId: order_id,
          side: "buy",
          userID: user_id,
        };
        const index = this.bids.findIndex((el: Order) => el.price > odr.price);

        if (index === -1) {
          this.bids.push(odr);
        } else {
          this.bids.splice(index, 0, odr);
        }

        bookWithQuantity.bids[price] =
          (bookWithQuantity.bids[price] || 0) + quantity;
      }
    }

    this.bids = this.bids.filter((_, idx) => !bid_splice_indexes.includes(idx));
    this.asks = this.asks.filter((_, idx) => !ask_splice_indexes.includes(idx));
    console.log(bookWithQuantity, "--------");

    return { order_id, fills };
  };
}
