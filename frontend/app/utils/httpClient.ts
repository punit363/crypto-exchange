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
    document.cookie = `${name}=${encodeURIComponent(
      value
    )}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax; ${secureFlag}`;
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

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // CRITICAL: Transmits cookies automatically to Express backend
});

// Outgoing Request interceptor: Attach tokens from localStorage defensively
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const accessToken = localStorage.getItem("access_token");
      if (accessToken) {
        config.headers["access_token"] = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error) => {
    console.error("[AXIOS REQUEST ERROR] Interceptor failed:", error);
    return Promise.reject(error);
  }
);

// =========================================================================
// CONCURRENCY LOCK & REFRESH QUEUE INTERCEPTOR
// Solves SPA race conditions where parallel requests hit backend together
// =========================================================================
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized and request has not been retried yet
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      // If refresh handshake is already active on another concurrent call, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["access_token"] = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Mark request as retried to prevent infinite 401 loops
      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        const refreshToken = localStorage.getItem("refresh_token");

        if (!refreshToken) {
          // No credentials available, proceed directly with cleanup
          handleWipeAndLogout();
          return reject(error);
        }

        console.log(
          "[AXIOS HANDSHAKE] Access token expired. Initiating atomic rotation..."
        );

        // Trigger a single, unified POST /auth/refresh request to the API Gateway
        apiClient
          .post("/auth/refresh", { refreshToken })
          .then(({ data }) => {
            const freshData = data.data || data;

            // Support both snake_case and camelCase returned values
            const newAccessToken =
              freshData.accessToken || freshData.access_token;
            const newRefreshToken =
              freshData.refreshToken || freshData.refresh_token;

            if (newAccessToken && newRefreshToken) {
              console.log(
                "[AXIOS HANDSHAKE SUCCESS] Rotated session cookies and headers successfully."
              );

              // 1. Write rotated signatures to Client State
              localStorage.setItem("access_token", newAccessToken);
              localStorage.setItem("refresh_token", newRefreshToken);

              // 2. Sync values back into Browser Cookies (24H container and 7D slider)
              setCookie("access_token", newAccessToken, 60 * 60 * 24 * 7); // 24 Hours (Matches 1d Token)
              setCookie("refresh_token", newRefreshToken, 60 * 60 * 24 * 7); // 7 Days

              // 3. Update active headers
              apiClient.defaults.headers.common[
                "access_token"
              ] = `Bearer ${newAccessToken}`;
              originalRequest.headers[
                "access_token"
              ] = `Bearer ${newAccessToken}`;

              // 4. Resolve paused items inside failed request queue
              processQueue(null, newAccessToken);

              // 5. Re-run and resolve original failed request
              resolve(apiClient(originalRequest));
            } else {
              throw new Error(
                "Returned payload does not contain required token contract structures."
              );
            }
          })
          .catch((err) => {
            console.error(
              "[AXIOS HANDSHAKE FAILURE] Critical session rotation fail:",
              err.message
            );
            processQueue(err, null);
            handleWipeAndLogout();
            toast.error("Session expired. Please log in again.");
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);

/**
 * Standard utility to clean local session keys and browser cookies
 */
function handleWipeAndLogout() {
  if (typeof window !== "undefined") {
    localStorage.clear();
    deleteCookie("access_token");
    deleteCookie("refresh_token");
    window.dispatchEvent(new Event("auth_change"));
  }
}

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

    // FIX: Set browser cookie Max-Age to 24 Hours (86400 seconds) to match the 1d JWT lifetime!
    setCookie("access_token", data.access_token, 60 * 60 * 24 * 7);
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
  market: string,
  type: "open" | "history"
) {
  const response = await apiClient.get(
    `/order?market=${market}&type=${type}`
  );
  console.log("User Orders Response:--------", response.data);
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
  console.log("Fetching depth for market:", market);
  const response = await apiClient.get(`/depth?market=${market}`);
  console.log("Depth response:", response.data);
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

/**
 * Retrieves the live balanced ledger from the database
 */
export async function getUserBalance(userId: string): Promise<any> {
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
  const response = await apiClient.post("/balance", payload);
  return response.data;
}

export async function getAssets(): Promise<string[]> {
  const response = await apiClient.get("/asset");
  // Adjust based on your API response wrapper (e.g., response.data.data or response.data)
  return response.data.data || response.data;
}
export async function cancelOrder(orderId: string, side: string, baseAsset: string, quoteAsset: string) {
  const response = await apiClient.delete("/order", {
    data: {
      order_id: orderId,
      side: side,
      base_asset: baseAsset,
      quote_asset: quoteAsset
    }
  });
  console.log("Cancel Order Response:--------", response.data);
  return response.data;
}