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

  subscribeToTrade = async () => {
    return new Promise(async (resolve, reject) => {
      try {
        await this.tradeSubscriber.subscribe("trade", async (message) => {
          console.log(message, "message");
          await this.tradeSubscriber.unsubscribe("trade");
          resolve(JSON.parse(message));
        });
      } catch (error) {
        reject(error);
      }
    });
  };

  subscribeToOrderbook = async () => {
    return new Promise(async (resolve, reject) => {
      try {
        await this.orderbookSubscriber.subscribe("book", async (message) => {
          console.log(message, "message");
          await this.orderbookSubscriber.unsubscribe("book");
          resolve(JSON.parse(message));
        });
      } catch (error) {
        reject(error);
      }
    });
  };
}

export default RedisHandler;
