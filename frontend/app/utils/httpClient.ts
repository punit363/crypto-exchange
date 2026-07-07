import axios from "axios";
import { Depth, KLine, Ticker, Trade } from "./types";

// const BASE_URL = "https://exchange-proxy.100xdevs.com/api/v1";
const BASE_URL = "http://localhost:3000/api/v1";

// Add this to your httpClient.ts
export async function getTicker(market: string) {
  // Replace this URL with your actual backend endpoint if it's different
  const response = await fetch(
    `http://localhost:3000/api/v1/tickers?symbol=${market}`
  );
  if (!response.ok) throw new Error("Failed to fetch ticker");
  return response.json();
}

export async function getUserOrders(
  userId: string,
  market: string,
  type: "open" | "history"
) {
  const response = await fetch(
    `http://localhost:3000/api/v1/order?userId=${userId}&market=${market}&type=${type}`
  );
  console.log("response=====================", response);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${type} orders`);
  }
  return response.json();
}

export async function getTickers(): Promise<Ticker[]> {
  const response = await axios.get(`${BASE_URL}/tickers`);
  return response.data;
}

export async function getDepth(market: string): Promise<Depth> {
  const response = await axios.get(`${BASE_URL}/depth?symbol=${market}`);
  return response.data;
}

export async function getTrades(market: string): Promise<Trade[]> {
  const response = await axios.get(`${BASE_URL}/trades?symbol=${market}`);
  return response.data;
}

export async function getKlines(
  market: string,
  interval: string,
  startTime: number,
  endTime: number
): Promise<KLine[]> {
  const response = await axios.get(
    `${BASE_URL}/kline?symbol=${market}&interval=${interval}&startTime=${startTime}&endTime=${endTime}`
  );
  const data: KLine[] = response.data;
  return data.sort((x, y) => (Number(x.end) < Number(y.end) ? -1 : 1));
}

// 💥 NEW: Functional Order Request Bridge 💥
export async function createOrder(orderPayload: {
  user_id: string;
  price: number;
  quantity: number;
  side: "buy" | "sell";
  type: "limit" | "market";
  baseAsset: string;
  quoteAsset: string;
}): Promise<any> {
  const response = await axios.post(`${BASE_URL}/order`, orderPayload);
  return response.data;
}
