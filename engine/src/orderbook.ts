interface Order {
  price: number;
  quantity: number;
  orderId: string;
}

interface Bid extends Order {
  side: "bid";
}

interface Ask extends Order {
  side: "ask";
}

interface Orderbook {
  bids: Bid[];
  asks: Ask[];
}

const orderbook: Orderbook = {
  bids: [],
  asks: [],
};

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
  tradeId: string;
}

export { Order, Bid, Ask, Orderbook, Fills, orderbook, bookWithQuantity };
