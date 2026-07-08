type Callback = (data: any) => void;

class WSManager {
  private static instance: WSManager;
  private ws: WebSocket | null = null;
  private url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:7001";

  private callbacks: Map<string, Callback[]> = new Map();
  private bufferedMessages: any[] = [];

  private isConnecting = false;
  private initialized = false;

  private constructor() {}

  public static getInstance(): WSManager {
    if (!WSManager.instance) {
      WSManager.instance = new WSManager();
    }
    return WSManager.instance;
  }

  public connect() {
    if (typeof window === "undefined") return;
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;

    this.isConnecting = true;

    // Check this port! Update it to 7001 if that is where your Node.js WS server is running.
    this.url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:7001";

    console.log(`⏳ Attempting to connect to WS at ${this.url}...`);
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.isConnecting = false;
      this.initialized = true;
      console.log("🟢 Connected to Trading WS");

      this.bufferedMessages.forEach((msg) => {
        this.ws?.send(JSON.stringify(msg));
      });
      this.bufferedMessages = [];
    };

    // 💥 ADD THIS ERROR HANDLER 💥
    this.ws.onerror = (error) => {
      console.error("🔴 WebSocket Error: ", error);
    };

    this.ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const market = parsed.market;

        if (!market) {
          console.warn("WS message missing 'market' field.", parsed);
          return;
        }
        
        // Console log for debugging
        console.log("🟢 WS RECEIVED:", parsed);

        // 1. Check for 'trade' instead of just 'fills'
        if (parsed.trade !== undefined || parsed.fills !== undefined) {
          const channel = `TRADE@${market}`;
          const cbs = this.callbacks.get(channel) || [];
          cbs.forEach((cb) => cb(parsed)); // Pass the whole object down
        } 
        
        // 2. Check for 'book' instead of just 'book_with_quantity'
        else if (parsed.book !== undefined || parsed.book_with_quantity !== undefined) {
          const channel = `BOOK@${market}`;
          const cbs = this.callbacks.get(channel) || [];
          cbs.forEach((cb) => cb(parsed)); // Pass the whole object down
        } 
        
        // 3. Ticker
        else if (parsed.ticker !== undefined) {
          const channel = `TICKER@${market}`;
          const cbs = this.callbacks.get(channel) || [];
          cbs.forEach((cb) => cb(parsed)); // Pass the whole object down
        }
        
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    this.ws.onclose = (event) => {
      this.isConnecting = false;
      this.initialized = false;
      this.ws = null;
      console.log(
        `🔴 WS Disconnected (Code: ${event.code}). Reconnecting in 3s...`
      );
      setTimeout(() => this.connect(), 3000);
    };
  }

  private sendSubscribe(market: string, type: "TRADE" | "BOOK" | "TICKER") {
    const message = { action: "SUBSCRIBE", type, market };

    // 3. Buffer the message if not ready yet!
    if (!this.initialized || this.ws?.readyState !== WebSocket.OPEN) {
      this.bufferedMessages.push(message);
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  private sendUnsubscribe(market: string, type: "TRADE" | "BOOK" | "TICKER") {
    const message = { action: "UNSUBSCRIBE", type, market };
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  public subscribe(
    market: string,
    type: "TRADE" | "BOOK" | "TICKER",
    callback: Callback
  ) {
    const channel = `${type}@${market}`;
    const cbs = this.callbacks.get(channel) || [];

    this.callbacks.set(channel, [...cbs, callback]);

    if (cbs.length === 0) {
      this.sendSubscribe(market, type);
    }
  }

  public unsubscribe(
    market: string,
    type: "TRADE" | "BOOK" | "TICKER",
    callback: Callback
  ) {
    const channel = `${type}@${market}`;
    const cbs = this.callbacks.get(channel) || [];

    const filtered = cbs.filter((cb) => cb !== callback);
    this.callbacks.set(channel, filtered);

    if (filtered.length === 0) {
      this.sendUnsubscribe(market, type);
    }
  }
}

export const wsClient = WSManager.getInstance();
