import Engine from "./engine";
import RedisHandler from "./redis";
const main = async () => {
  const engine = new Engine()
  let i = 0;
  const redis = await RedisHandler.createInstance();
  while (true) {
    console.log("loop", i++);
    const order = await redis.getOrderFromQueue();
    
    if (order) {
      await engine.processOrder(JSON.parse(order.element));
      console.log(JSON.parse(order.element), "engine order");
    }
  }
};

main();
