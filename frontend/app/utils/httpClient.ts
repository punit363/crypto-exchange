import axios from "axios";
import { toast } from "react-hot-toast";
import { Depth, KLine, Ticker } from "./types";

const BASE_URL = "http://localhost:8000/api/v1";

/* STREAMING_CHUNK: Implementing native cookie helpers for Edge compatibility... */
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

/* STREAMING_CHUNK: Initializing the custom Axios instance with credentials... */
// Create custom axios instance
export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // CRITICAL: Automatically transmits Secure/HTTP-Only cookies to Express backend
});

// Outgoing Request interceptor: Attach tokens defensively
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

/* STREAMING_CHUNK: Configuring unified responses and error toast intercepts... */
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
        // Clear local storage, wipe cookies, and dispatch standard logout trigger
        localStorage.clear();
        deleteCookie("access_token");
        deleteCookie("refresh_token");
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

/* STREAMING_CHUNK: Upgrading login auth session storage... */
// Authentication handlers
export async function login(payload: {
  user_id?: string;
  email?: string;
  password?: string;
}) {
  console.log("payload----------", payload);
  const response = await apiClient.post("/auth/login", payload);
  const data = handleResponse(response.data);
  console.log("data----------", data);

  if (typeof window !== "undefined" && data) {
    // 1. Write tokens to LocalStorage for SPA states
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

    // 2. Synchronize tokens into Browser Cookies for Server-Side Edge Middleware
    setCookie("access_token", data.access_token, 15 * 60); // 15 Minutes Max-Age
    setCookie("refresh_token", data.refresh_token, 60 * 60 * 24 * 7); // 7 Days Max-Age

    // 3. Dispatch global layout listeners
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

/* STREAMING_CHUNK: Configuring secure logout procedures... */
export async function logout() {
  try {
    await apiClient.post("/auth/logout");
  } catch (error) {
    console.warn("Backend token invalidation skipped (token might be already expired):", error);
  } finally {
    if (typeof window !== "undefined") {
      // 1. Wipe client caches
      localStorage.clear();

      // 2. Clear server-side Edge cookies
      deleteCookie("access_token");
      deleteCookie("refresh_token");

      // 3. Dispatch global state event and notify user
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