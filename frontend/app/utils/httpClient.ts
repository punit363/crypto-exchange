import axios from "axios";
import { toast } from "react-hot-toast";
import { Depth, KLine, Ticker } from "./types";

const BASE_URL = "http://localhost:8000/api/v1";

/**
 * Helper to write browser cookies safely on the client side
 */
function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document !== "undefined") {
    const secureFlag = window.location.protocol === "https:" ? "Secure;" : "";
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax; ${secureFlag}`;
  }
}

/**
 * Helper to wipe a browser cookie on the client side
 */
function deleteCookie(name: string) {
  if (typeof document !== "undefined") {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax;`;
  }
}

/* STREAMING_CHUNK: Initializing axios client with strict credential flags... */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Transmits cookies to backend natively
});

// Outgoing Request interceptor: Attach tokens from localStorage defensively
apiClient.interceptors.request.use(
  (config) => {
    console.log("[AXIOS REQUEST INTERCEPTOR] Dispatching outgoing request:", config.url);
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
  (error) => {
    console.error("[AXIOS REQUEST ERROR] Interceptor failed:", error);
    return Promise.reject(error);
  }
);

/* STREAMING_CHUNK: Creating response interceptors with error catch lines... */
// Response interceptor: Global error parsing + auto-refresh/logout handling
apiClient.interceptors.response.use(
  (response) => {
    console.log("[AXIOS RESPONSE INTERCEPTOR] Received response body:", response.data);
    const result = response.data;
    if (result && result.status === 0) {
      toast.error(result.message || "An unexpected error occurred.");
      return Promise.reject(new Error(result.message));
    }
    return response;
  },
  async (error) => {
    console.error("[AXIOS RESPONSE ERROR] Interceptor caught exception:", error);
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || "";

      if (status === 401) {
        localStorage.clear();
        deleteCookie("access_token");
        deleteCookie("refresh_token");
        window.dispatchEvent(new Event("auth_change"));

        if (message.includes("Session expired") || message.includes("revoked")) {
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
  const response = await apiClient.post("/auth/login", payload);
  const data = handleResponse(response.data);

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

    setCookie("access_token", data.access_token, 15 * 60);
    setCookie("refresh_token", data.refresh_token, 60 * 60 * 24 * 7);

    window.dispatchEvent(new Event("auth_change"));
    toast.success("Logged in successfully!");
  }
  return data;
}

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

export async function logout() {
  try {
    await apiClient.post("/auth/logout");
  } catch (error) {
    console.warn("Backend token invalidation skipped:", error);
  } finally {
    if (typeof window !== "undefined") {
      localStorage.clear();
      deleteCookie("access_token");
      deleteCookie("refresh_token");
      window.dispatchEvent(new Event("auth_change"));
      toast.success("Logged out successfully.");
    }
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

/* STREAMING_CHUNK: Creating high-performance isolated balance API triggers... */
/**
 * Retrieves the live balanced ledger from the engine database
 */
export async function getUserBalance(userId: string): Promise<any> {
  console.log("[API GET BALANCE] Initiating request for User ID:", userId);
  const response = await apiClient.get(`/balance?userId=${userId}`);
  return response.data;
}

/**
 * Triggers a secure Deposit or Withdrawal adjustment request directly to the Engine
 */
export async function updateUserBalance(payload: {
  user_id: string;
  amount: number;
  asset: string;
  type: "deposit" | "withdraw" | string;
}): Promise<any> {
  console.log("[API UPDATE BALANCE] Initiating POST request with payload:", payload);
  const response = await apiClient.post("/balance", payload);
  console.log("[API UPDATE BALANCE] Received response:", response.data);
  return response.data;
}