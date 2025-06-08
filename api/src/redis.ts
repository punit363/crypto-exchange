import { createClient } from "redis";

let client: any;

const createRedisClient = async () => {
  if (!client) {
    client = createClient();
    client.on("error", (err: any) => console.log("Redis Client Error", err));
    await client.connect();
  }
  return client;
};

const pushOrderToQueue = async (order: any) => {
  const client = await createRedisClient();
  await client.lPush("order", JSON.stringify(order));
  console.log("Enqueued:", order);
};

const getOrderResponse = async (order_id: string) => {
  const subscriber = createClient();
  await subscriber.connect();
  await subscriber.subscribe(order_id, (order_response) => {
    subscriber.unsubscribe(order_id);
    console.log(order_response); // 'message'
  });
};

export { createRedisClient, pushOrderToQueue, getOrderResponse };
