import axios from "axios";
import { Depth, KLine, Ticker, Trade } from "./types";

const BASE_URL = "http://localhost:3000/api/v1";

// Add this to your httpClient.ts
export async function getTicker(market: string) {
  const response = await fetch(`${BASE_URL}/ticker?symbol=${market}`);
  if (!response.ok) throw new Error("Failed to fetch ticker");
  return response.json();
}

export async function getUserOrders(
  userId: string,
  market: string,
  type: "open" | "history"
) {
  const response = await fetch(
    `${BASE_URL}/order?userId=${userId}&market=${market}&type=${type}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch ${type} orders`);
  }
  return response.json();
}

export async function getTickers(): Promise<Ticker[]> {
  const response = await axios.get(`${BASE_URL}/tickers`);
  return response.data;
}

export async function getTrades(market: string): Promise<any[]> {
  const response = await fetch(`${BASE_URL}/trades?symbol=${market}`);
  if (!response.ok) {
    throw new Error("Failed to fetch initial trades");
  }
  return response.json();
}

export async function getDepth(market: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/depth?symbol=${market}`);
  if (!response.ok) {
    throw new Error("Failed to fetch initial depth");
  }
  return response.json();
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
