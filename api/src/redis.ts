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

export { createRedisClient, pushOrderToQueue };
