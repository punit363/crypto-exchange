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
};

const getOrderResponse = async (order_id: string) => {
  const subscriber = createClient();
  await subscriber.connect();
  return new Promise((resolve, reject) => {
    subscriber.subscribe(order_id, async (message) => {
      try {
        await subscriber.unsubscribe(order_id);
        await subscriber.quit();
        resolve(JSON.parse(message));
      } catch (err) {
        reject(err);
      }
    });
  });
};

export { createRedisClient, pushOrderToQueue, getOrderResponse };
