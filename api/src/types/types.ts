type OrderData = {
  order_id: string;
  price?: number;
  quantity?: number;
  side?: string;
  type?: string;
};

type OrderToEngine = {
  action: string;
  order_data: OrderData;
};

export { OrderToEngine };
