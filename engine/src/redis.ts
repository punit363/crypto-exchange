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

  sendApiResponse = async (engine_response: any, engine_request_id: string) => {
    console.log("resp sent------------", engine_response);
    await this.publisher.publish(
      engine_request_id,
      JSON.stringify(engine_response)
    );
  };

  getMessage = async () => {
    const message = await this.client.brPop("message", 0);
    return message;
  };

  sendToDB = async (data: any) => {
    const order = this.client.lPush("db_update", JSON.stringify(data));
    return order;
  };

  publishTrade = (trade_details: any) => {
    console.log("publishing trade");
    return this.publisher.publish("trade", JSON.stringify(trade_details));
  };

  publishOrderBookWithQuantity = (book_details: any) => {
    console.log("publishing book");
    return this.publisher.publish("book", JSON.stringify(book_details));
  };

  setBookWithQuantity = (payload: any, market: string) => {
    return this.client.set(`DEPTH:${market}`, JSON.stringify(payload));
  };
}
export default RedisHandler;
