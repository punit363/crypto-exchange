import { engine } from "./engine";
import RedisHandler from "./redis";
const main = async () => {
  let i = 0;
  const redis = await RedisHandler.createInstance();
  while (true) {
    console.log("loop", i++);
    const order = await redis.getOrderFromQueue();
    
    if (order) {
      await engine(JSON.parse(order.element));
      console.log(JSON.parse(order.element), "engine order");
    }
  }
};

main();
