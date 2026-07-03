import { Prisma } from "@prisma/client";

interface User {
  user_id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  age: number;
  phone: string;
}

interface Transaction {
  tx_id: string;
  user_id: string;
  type: string;
  asset: string;
  amount: Prisma.Decimal;
  status: string;
}

interface Trade {
  trade_id: string;
  user_id: string;
  other_user_id: string;
  order_id: string;
  other_order_id: string;
  quantity: Prisma.Decimal;
  price: Prisma.Decimal;
  base_asset: string;
  quote_asset: string;
  side: string;
}

interface Candle {
  candle_id: string;
  interval: string;
  base_asset: string;
  quote_asset: string;
  open: Prisma.Decimal;
  high: Prisma.Decimal;
  low: Prisma.Decimal;
  close: Prisma.Decimal;
  volume: Prisma.Decimal;
}

interface Balance {
  id: string;
  user_id: string;
  asset: string;
  amount: Prisma.Decimal;
  type: string;
  status: string;
  ref_id: string;
}

interface Order {
  order_id: string;
  user_id: string;
  side: string;
  type: string;
  quantity: Prisma.Decimal;
  filled_quantity: Prisma.Decimal;
  price: Prisma.Decimal;
  status: string;
  base_asset: string;
  quote_asset: string;
}

export { User, Transaction, Trade, Candle, Balance, Order };
