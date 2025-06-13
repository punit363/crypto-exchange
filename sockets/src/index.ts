//@ts-ignore
import WebSocket, { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 3001 });
wss.on(
  "connection",
  function connection(ws: { send: (arg0: string) => void; }) {
    // ws.on("error", console.error);

    // ws.on("message", function message(data: any) {
    //   console.log("received: %s", data);
    // });

    ws.send("something");
  }
);
