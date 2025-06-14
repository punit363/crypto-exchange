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

  sendOrderResponse = async (order_response: any) => {
    console.log(order_response, "publisher");
    await this.publisher.publish(
      order_response.order_id,
      JSON.stringify(order_response)
    );
  };

  getOrderFromQueue = async () => {
    const order = await this.client.brPop("order", 0);
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
