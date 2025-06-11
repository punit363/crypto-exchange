import { Ask, Bid, bookWithQuantity, Fills, orderbook } from "./orderbook";
import { sendOrderResponse } from "./redis";

const engine = async (order: {
  action: string;
  order_data: { order_id: any; price?: any; quantity?: any; side?: any };
}) => {
  console.log(order, "engine order inside 1");
  switch (order.action) {
    case "PLACE_ORDER":
      let { order_id, price, quantity, side } = order.order_data;

      console.log(order, "engine order inside 2");
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
          const index = orderbook.asks.findIndex(
            (el: Ask) => el.price > odr.price
          );

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
          const index = orderbook.bids.findIndex(
            (el: Bid) => el.price > odr.price
          );

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
      break;

    case "CANCEL_ORDER":
      //Loop through both the bids and asks array
      //collect indexes of matches wrt order_id
      //In this same iteration reduce amounts from bookWithQuantity object
      //use the previous index array to filter from orderbook
      //
      console.log(order, "engine order");
      const asks_array_index: number[] = [];
      const bids_array_index: number[] = [];
      orderbook.asks.forEach((o) => {
        if (o.orderId == order.order_data.order_id) {
          asks_array_index.push(orderbook.asks.indexOf(o));
          bookWithQuantity.asks[o.price] -= o.quantity;
        }
      });
      orderbook.bids.forEach((o) => {
        if (o.orderId == order.order_data.order_id) {
          bids_array_index.push(orderbook.bids.indexOf(o));
          bookWithQuantity.bids[o.price] -= o.quantity;
        }
      });

      orderbook.bids = orderbook.bids.filter(
        (_, idx) => !bids_array_index.includes(idx)
      );
      orderbook.asks = orderbook.asks.filter(
        (_, idx) => !asks_array_index.includes(idx)
      );

      console.log(asks_array_index, "asks_array_index order");
      console.log(bids_array_index, "bids_array_index order");
      console.log(orderbook, "orderbook order");
      console.log(bookWithQuantity, "bookWithQuantity order");

      await sendOrderResponse({
        order_id: order.order_data.order_id,
        message: "Order cancelled successfully",
      });
      break;
  }
};

export { engine };
