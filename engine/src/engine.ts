import { Ask, Bid, bookWithQuantity, Fills, orderbook } from "./orderbook";
import { sendOrderResponse } from "./redis";

const engine = async (order: {
  order_id: any;
  price?: any;
  quantity?: any;
  side?: any;
}) => {
  let { order_id, price, quantity, side } = order;

  console.log(order, "engine order inside");
  const fills: Fills[] = [];

  const ask_splice_indexes: number[] = [];
  const bid_splice_indexes: number[] = [];

  const tradeId = "#5234";
  let i = 0;
  if (side == "sell") {
    orderbook.bids.forEach((o: Bid) => {
      i++;
      if (price <= o.price) {
        const fillQuantity = Math.min(quantity, o.quantity);
        o.quantity -= fillQuantity;
        bookWithQuantity.bids[o.price] =
          (bookWithQuantity.bids[o.price] || 0) - fillQuantity;
        fills.push({ price: o.price, quantity: fillQuantity, tradeId });
        quantity -= fillQuantity;
        if (o.quantity === 0) {
          bid_splice_indexes.push(orderbook.bids.indexOf(o));
        }
      }
      if (bookWithQuantity.bids[o.price] === 0) {
        delete bookWithQuantity.bids[o.price];
      }
    });

    if (quantity != 0) {
      //Insert order in sorted format
      const odr: Ask = { price, quantity, orderId: order_id, side: "ask" };
      const index = orderbook.asks.findIndex((el: Ask) => el.price > odr.price);

      if (index === -1) {
        orderbook.asks.push(odr);
      } else {
        orderbook.asks.splice(index, 0, odr);
      }

      bookWithQuantity.asks[price] =
        (bookWithQuantity.asks[price] || 0) + quantity;
    }
  }

  if (side == "buy") {
    orderbook.asks.forEach((o: Ask) => {
      if (price >= o.price) {
        const fillQuantity = Math.min(quantity, o.quantity);
        o.quantity -= fillQuantity;
        bookWithQuantity.asks[o.price] =
          (bookWithQuantity.asks[o.price] || 0) - fillQuantity;

        fills.push({ price: o.price, quantity: fillQuantity, tradeId });
        quantity -= fillQuantity;

        if (o.quantity === 0) {
          ask_splice_indexes.push(orderbook.asks.indexOf(o));
        }
      }

      if (bookWithQuantity.asks[o.price] === 0) {
        delete bookWithQuantity.asks[o.price];
      }
    });

    if (quantity != 0) {
      //Insert order in sorted format
      const odr: Bid = { price, quantity, orderId: order_id, side: "bid" };
      const index = orderbook.bids.findIndex((el: Bid) => el.price > odr.price);

      if (index === -1) {
        orderbook.bids.push(odr);
      } else {
        orderbook.bids.splice(index, 0, odr);
      }

      bookWithQuantity.bids[price] =
        (bookWithQuantity.bids[price] || 0) + quantity;
    }
  }

  orderbook.bids = orderbook.bids.filter(
    (_, idx) => !bid_splice_indexes.includes(idx)
  );
  orderbook.asks = orderbook.asks.filter(
    (_, idx) => !ask_splice_indexes.includes(idx)
  );
  console.log(orderbook, "++++++++");
  console.log(bookWithQuantity, "--------");
  await sendOrderResponse({ order_id, fills });
};

export { engine };
