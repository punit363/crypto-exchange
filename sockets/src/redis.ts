import { createClient, RedisClientType } from "redis";

class RedisHandler {
  private tradeSubscriber!: RedisClientType;
  private orderbookSubscriber!: RedisClientType;
  private static instance: RedisHandler;

  init = async () => {
    this.tradeSubscriber = createClient();
    this.orderbookSubscriber = createClient();

    await this.tradeSubscriber.connect();
    await this.orderbookSubscriber.connect();
  };

  static createInstance = async () => {
    if (!this.instance) {
      this.instance = new RedisHandler();
      await this.instance.init();
    }
    return this.instance;
  };

  subscribeToTrade = async (callback: (data: any) => void) => {
    await this.tradeSubscriber.subscribe("trade", (message) => {
      console.log(message, "message");
      this.tradeSubscriber.unsubscribe("trade");
      callback(JSON.parse(message));
    });
  };

  subscribeToOrderbook = async (callback: (data: any) => void) => {
    await this.orderbookSubscriber.subscribe("book", (message) => {
      console.log(message, "message");
      this.orderbookSubscriber.unsubscribe("book");
      callback(JSON.parse(message));
    });
  };
}

export default RedisHandler;
