import { createRedisClient } from "./redis";
import { engine } from "./engine";
const main = async () => {
  const client = await createRedisClient();
  console.log(client, "client");
  while (true) {
    const order = await client.brPop("order", 0);
    console.log(JSON.parse(order.element), "engine order");
    await engine(JSON.parse(order.element));
  }
};

main();
