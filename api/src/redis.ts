import { createClient, RedisClientType } from "redis";
import { OrderToEngine } from "./types/types";

class RedisHandler {
  private client!: RedisClientType;
  private subscriber!: RedisClientType;
  private static instance: RedisHandler;

  init = async () => {
    this.client = createClient();
    this.subscriber = createClient();

    await this.client.connect();
    await this.subscriber.connect();

    this.client.on("error", (err: any) =>
      console.error("Redis Client Error", err)
    );
    this.subscriber.on("error", (err: any) =>
      console.error("Redis Publisher Error", err)
    );
  };

  static createInstance = async () => {
    if (!RedisHandler.instance) {
      RedisHandler.instance = new RedisHandler();
      await RedisHandler.instance.init();
    }
    return RedisHandler.instance;
  };

  sendAndAwait = async (order: OrderToEngine) => {
    await this.client.lPush("order", JSON.stringify(order));
    console.log(order.order_data.order_id, "order.order_data.order_id");
    return new Promise((resolve, reject) => {
      this.subscriber.subscribe(order.order_data.order_id, async (message) => {
        try {
          console.log(message, "message");
          await this.subscriber.unsubscribe(order.order_data.order_id);
          console.log(message, "message");
          resolve(JSON.parse(message));
        } catch (err) {
          reject(err);
        }
      });
    });
  };
}
export default RedisHandler;
