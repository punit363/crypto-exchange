//@ts-ignore
import { WebSocketServer } from "ws";
import RedisHandler from "./redis";

const wss = new WebSocketServer({ port: 3001 });
wss.on("connection", async function connection(ws: any) {
  // ws.on("error", console.error);
  console.log("received: %s");

  ws.on("message", async function message(data: any) {
    console.log("received: %s", data);
    data = JSON.parse(data);
    if (data.action === "SUBSCRIBE" && data.type === "BOOK") {
      console.log("received: %s", data);
      const redis = await RedisHandler.createInstance();
      redis.subscribeToOrderbook((book_data) => {
        ws.send(JSON.stringify({ book: book_data }));
      });
      console.log("ok socket");
    }
    if (data.action === "SUBSCRIBE" && data.type === "TRADE") {
      console.log("received: %s", data);
      const redis = await RedisHandler.createInstance();
      const trade_data = await redis.subscribeToTrade((trade_data) => {
        ws.send(JSON.stringify({ trade: trade_data }));
      });
      console.log("ok socket");
    }
  });
});
