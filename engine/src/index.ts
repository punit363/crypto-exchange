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

/**
 * 
 * bids: { '200': 30 },
 * asks: { '210': 20 }
 * 
 * problem: 
 * if it is market
 * logs into fills
 * never logs into orderbook's bid and ask
 * never log in to book with quantity
 * the order either executes or returns remaining price/quantity
 * 
 */