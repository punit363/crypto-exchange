import { createRedisClient } from "./redis";
import { engine } from "./engine";
const main = async () => {
  const client = await createRedisClient();
  console.log(client, "client");
  let i = 0;
  while (true) {
    console.log("loop", i++);
    const order = await client.brPop("order", 0);
    if (order) {
      await engine(JSON.parse(order.element));
      console.log(JSON.parse(order.element), "engine order");
    }
  }
};

main();
