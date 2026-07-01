type OrderData = {
  order_id: string;
  price?: number;
  quantity?: number;
  side?: string;
  type?: string;
  market?: string;
};

type OrderToEngine = {
  action: string;
  user_id: string;
  order_data: OrderData;
};

type UserData = {
  user_id: string;
  first_name: string;
  last_name: string;
  age: number;
  email: string;
  phone: string;
  password: string;
};

export { OrderToEngine, UserData };
