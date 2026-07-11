import axios from "axios";
import { toast } from "react-hot-toast";
import { Depth, KLine, Ticker, Trade } from "./types";

const BASE_URL = "http://localhost:3000/api/v1";

/**
 * Shared helper to handle the unified { data, status, message } response
 */
async function handleResponse(res: any, isAxios: boolean = false) {
  const result = isAxios ? res.data : await res.json();

  if (result.status === 0) {
    toast.error(result.message || "An error occurred");
    throw new Error(result.message);
  }

  // If the API wrapped the payload in .data, return just that.
  // Otherwise, return the whole result object.
  return result.data !== undefined ? result.data : result;
}

export async function getTicker(market: string) {
  const response = await fetch(`${BASE_URL}/ticker?market=${market}`);
  return handleResponse(response);
}

export async function getUserOrders(
  userId: string,
  market: string,
  type: "open" | "history"
) {
  const response = await fetch(
    `${BASE_URL}/order?userId=${userId}&market=${market}&type=${type}`
  );
  // We handle manually here to preserve the object structure for the component
  const result = await response.json();
  if (result.status === 0) {
    toast.error(result.message);
    throw new Error(result.message);
  }
  return result.data ?? result;
}

export async function getTickers(): Promise<Ticker[]> {
  const response = await axios.get(`${BASE_URL}/tickers`);
  return handleResponse(response, true);
}

export async function getTrades(market: string): Promise<any[]> {
  const response = await fetch(`${BASE_URL}/trades?market=${market}`);
  return handleResponse(response);
}

export async function getDepth(market: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/depth?symbol=${market}`);
  return handleResponse(response);
}

export async function getKlines(
  market: string,
  interval: string,
  startTime: number,
  endTime: number
): Promise<KLine[]> {
  const response = await axios.get(
    `${BASE_URL}/kline?market=${market}&interval=${interval}&startTime=${startTime}&endTime=${endTime}`
  );
  const data: KLine[] = await handleResponse(response, true);
  return data.sort((x, y) => (Number(x.end) < Number(y.end) ? -1 : 1));
}

export async function createOrder(orderPayload: any): Promise<any> {
  const response = await axios.post(`${BASE_URL}/order`, orderPayload);
  const data = await handleResponse(response, true);
  toast.success("Order placed successfully");
  return data;
}