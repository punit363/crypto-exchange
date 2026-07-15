//@ts-ignore
import { WebSocketServer } from "ws";
import RedisHandler from "./redis";

const wss = new WebSocketServer({ port: 7001 });

wss.on("connection", (ws: any) => {
  console.log("🟢 Client connected to WS");

  ws.on("message", async (message: any) => {
    // Ensure we parse the string buffer coming from the browser
    const data = JSON.parse(message.toString());
    console.log("📥 Received:", data);

    const redis = await RedisHandler.createInstance();

    if (data.action === "SUBSCRIBE") {
      const market = data.market; // e.g., "BTC_INR"

      if (data.type === "BOOK") {
        console.log(`Subscribing to BOOK for ${market}`);
        // Make sure your Redis handler knows WHICH market to subscribe to!
        redis.subscribeToOrderbook(market, (book_data) => {
          ws.send(JSON.stringify(book_data));
        });
      }

      if (data.type === "TRADE") {
        console.log(`Subscribing to TRADE for ${market}`);
        redis.subscribeToTrade(market, (trade_data) => {
          ws.send(JSON.stringify(trade_data));
        });
      }

      if (data.type === "TICKER") {
        console.log(`Subscribing to TICKER for ${market}`);
        redis.subscribeToTicker(market, (ticker_data) => {
          ws.send(JSON.stringify(ticker_data));
        });
      }
    }
  });
});
