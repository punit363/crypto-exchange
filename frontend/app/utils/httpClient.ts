import axios from "axios";
import { toast } from "react-hot-toast";
import { Depth, KLine, Ticker } from "./types";

const BASE_URL = "http://localhost:8000/api/v1";

// Create custom axios instance
export const apiClient = axios.create({
  baseURL: BASE_URL,
});

// Outgoing Request interceptor: Attach tokens
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const accessToken = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");

      if (accessToken) {
        config.headers["access_token"] = `Bearer ${accessToken}`;
      }
      if (refreshToken) {
        config.headers["refresh_token"] = `Bearer ${refreshToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Global error parsing + auto-refresh/logout handling
apiClient.interceptors.response.use(
  (response) => {
    const result = response.data;
    if (result && result.status === 0) {
      toast.error(result.message || "An unexpected error occurred.");
      return Promise.reject(new Error(result.message));
    }
    return response;
  },
  async (error) => {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || "";

      if (status === 401) {
        // Clear local storage and dispatch standard logout trigger
        localStorage.clear();
        window.dispatchEvent(new Event("auth_change"));

        if (
          message.includes("Session expired") ||
          message.includes("revoked")
        ) {
          toast.error("Session expired. Please log in again.");
        }
      } else {
        toast.error(message || "Server Error. Try again.");
      }
    } else {
      toast.error("Network offline. Please check your internet connection.");
    }
    return Promise.reject(error);
  }
);

/**
 * Handle unified standard response
 */
function handleResponse(result: any) {
  if (!result) return null;
  return result.data !== undefined ? result.data : result;
}

// Authentication handlers
export async function login(payload: {
  user_id?: string;
  email?: string;
  password?: string;
}) {
  console.log("payload----------",payload);
  const response = await apiClient.post("/auth/login", payload);
  const data = handleResponse(response.data);
  console.log("data----------",data);

  if (typeof window !== "undefined" && data) {
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    localStorage.setItem(
      "user_profile",
      JSON.stringify({
        user_id: data.user_id,
        email: data.email,
        phone: data.phone,
        first_name: data.first_name,
        last_name: data.last_name,
        age: data.age,
      })
    );
    window.dispatchEvent(new Event("auth_change"));
    toast.success("Logged in successfully!");
  }
  return data;
}

/**
 * Registers new user using the custom POST /user endpoint payload keys
 */
export async function registerUser(payload: {
  firstname: string;
  lastname: string;
  age: number;
  email: string;
  phone: string;
  password?: string;
}) {
  const response = await apiClient.post("/user", payload);
  const data = handleResponse(response.data);
  toast.success("Account created successfully! Please log in.");
  return data;
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.clear();
    window.dispatchEvent(new Event("auth_change"));
    toast.success("Logged out successfully.");
  }
}

export function getActiveUser() {
  if (typeof window !== "undefined") {
    const profile = localStorage.getItem("user_profile");
    const token = localStorage.getItem("access_token");
    if (profile && token) {
      try {
        return JSON.parse(profile);
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Market endpoints
export async function getTicker(market: string) {
  const response = await apiClient.get(`/ticker?market=${market}`);
  return handleResponse(response.data);
}

export async function getUserOrders(
  userId: string,
  market: string,
  type: "open" | "history"
) {
  const response = await apiClient.get(
    `/order?userId=${userId}&market=${market}&type=${type}`
  );
  return handleResponse(response.data);
}

export async function getTickers(): Promise<Ticker[]> {
  const response = await apiClient.get("/tickers");
  return handleResponse(response.data);
}

export async function getTrades(market: string): Promise<any[]> {
  const response = await apiClient.get(`/trades?market=${market}`);
  return handleResponse(response.data);
}

export async function getDepth(market: string): Promise<any> {
  const response = await apiClient.get(`/depth?symbol=${market}`);
  return handleResponse(response.data);
}

export async function getKlines(
  market: string,
  interval: string,
  startTime: number,
  endTime: number
): Promise<KLine[]> {
  const response = await apiClient.get(
    `/kline?market=${market}&interval=${interval}&startTime=${startTime}&endTime=${endTime}`
  );
  const data: KLine[] = handleResponse(response.data);
  return data.sort((x, y) => (Number(x.end) < Number(y.end) ? -1 : 1));
}

export async function createOrder(orderPayload: any): Promise<any> {
  const response = await apiClient.post("/order", orderPayload);
  const data = handleResponse(response.data);
  toast.success("Order placed successfully!");
  return data;
}
