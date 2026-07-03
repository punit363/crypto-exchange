import Engine from "./engine";
import RedisHandler from "./redis";
// const main = async () => {
//   const engine = new Engine()
//   let i = 0;
//   const redis = await RedisHandler.createInstance();
//   while (true) {
//     console.log("loop", i++);
//     const order = await redis.getOrderFromQueue();
//     console.log("order-----------engine/indexjs", order);
//     if (order) {
//       await engine.processOrder(JSON.parse(order.element));
//       console.log(JSON.parse(order.element), "engine order");
//     }

//   }
// };

// main();

// engine processes one queue sequentially — order guaranteed
const main = async () => {
  const engine = new Engine();
  const redis = await RedisHandler.createInstance();

  while (true) {
    try {
      const message = await redis.getMessage(); // one queue: "engine_queue"
      if (!message) continue;

      const parsed = JSON.parse(message.element);
      const engine_request_id = parsed.engine_request_id;

      switch (parsed.type) {
        case "ORDER":
          console.log("order-----------------",parsed)
          console.log("order-----------------",parsed.order)
          await engine.processOrder(parsed.order, engine_request_id);
          break;
        case "BALANCE":
          console.log("balance-----------------",parsed)
          console.log("balance-----------------",parsed.transaction)
          await engine.processBalanceUpdate(parsed.transaction, engine_request_id);
          break;
        default:
          console.warn("Unknown action:", parsed.action);
      }
    } catch (err) {
      console.error("Error processing message:", err);
    }
  }
};

main().catch(console.error);

//Finally felt the single threaded nature of javascript--now i can little bit understand what senior devs face

// const main = async () => {
//   const engine = new Engine()

//   // Two separate Redis connections else the first process blocks the other due to 0 timeout in queue
//   const orderRedis = await RedisHandler.createInstance()
//   const balanceRedis = await RedisHandler.createInstance()

//   const processOrders = async () => {
//     while (true) {
//       try {
//         const order = await orderRedis.getOrderFromQueue() // blocks on its own connection
//         if (order) {
//           const parsed = JSON.parse(order.element)
//           console.log("order received:", parsed)
//           await engine.processOrder(parsed)
//         }
//       } catch (err) {
//         console.error("Error processing order:", err)
//       }
//     }
//   }

//   const processBalanceUpdates = async () => {
//     while (true) {
//       try {
//         const balance_data = await balanceRedis.getBalanceUpdateFromQueue() // blocks on its own connection
//         if (balance_data) {
//           const parsed = JSON.parse(balance_data.element)
//           console.log("balance update received:", parsed)
//           await engine.processBalanceUpdate(parsed)
//         }
//       } catch (err) {
//         console.error("Error processing balance update:", err)
//       }
//     }
//   }

//   await Promise.all([
//     processOrders(),
//     processBalanceUpdates(),
//   ])
// }

// main().catch(console.error)
