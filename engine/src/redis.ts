import { createClient, RedisClientType } from "redis";

class RedisHandler {
  private client!: RedisClientType;
  private publisher!: RedisClientType;
  private static instance: RedisHandler;

  init = async () => {
    this.client = createClient();
    this.publisher = createClient();

    await this.client.connect();
    await this.publisher.connect();
  };

  static createInstance = async () => {
    if (!RedisHandler.instance) {
      RedisHandler.instance = new RedisHandler();
      await RedisHandler.instance.init();
    }
    return RedisHandler.instance;
  };

  sendApiResponse = async (engine_response: any,engine_request_id:string) => {
    console.log(engine_response, "publisher");
    await this.publisher.publish(
      engine_request_id,
      JSON.stringify(engine_response)
    );
  };

  getOrderFromQueue = async () => {
    const order = await this.client.brPop("order", 0);
    return order;
  };

  getMessage = async () => {
    const message = await this.client.brPop("message", 0);
    return message;
  };

  getBalanceUpdateFromQueue = async () => {
    const balance = await this.client.brPop("balance", 0);
    console.log("balance redis engine-----------",balance)
    return balance;
  };

  sendToDB = async (data: any) => {
    const order = await this.client.lPush("db_update", JSON.stringify(data));
    return order;
  };

  publishTrade = async (trade_details: any) => {
    console.log("publishing trade");
    await this.publisher.publish("trade", JSON.stringify(trade_details));
  };

  publishOrderBookWithQuantity = async (book_details: any) => {
    console.log("publishing book");
    await this.publisher.publish("book", JSON.stringify(book_details));
  };
}
export default RedisHandler;
