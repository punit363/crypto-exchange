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

const sendOrderResponse = async (order_response: any) => {
  console.log(order_response, "publisher");
  const publisher = createClient();
  await publisher.connect();
  await publisher.publish(
    order_response.order_id,
    JSON.stringify(order_response)
  );
};

export { createRedisClient, sendOrderResponse };
