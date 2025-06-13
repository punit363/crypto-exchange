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
    }
    await this.instance.init();
    return this.instance;
  };
}

export default RedisHandler;
