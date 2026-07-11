type OrderData = {
  order_id?: string;
  price?: number;
  quantity?: number;
  side?: string;
  type?: string;
  baseAsset?: string;
  quoteAsset?: string;
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

type BalanceUpdate = {
  tx_id: string;
  user_id: string;
  asset: string;
  type: string;
  amount: number;
};

type EngineRequest = {
  type: string;
  order?: OrderToEngine;
  transaction?: BalanceUpdate;
};

type EngineResponse = {
  data?: any;
  eng_status_code: number;
  status: "SUCCESS" | "FAILED";
  message: string;
};

export {
  OrderToEngine,
  UserData,
  BalanceUpdate,
  EngineRequest,
  EngineResponse,
};
