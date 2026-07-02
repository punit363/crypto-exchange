//Initiating db

import RedisHandler from "./redis.js";

const dbMain = async () => {
  const redis = await RedisHandler.createInstance();
  while (true) {
    const trade = await redis.getTradeDetail();
    if (trade) {
      //DB logic
    }
  }
};

dbMain();

export { prisma } from "./client.js";
// export { UserRepo } from "./repositories/user.repo"
// export { OrderRepo } from "./repositories/order.repo"
// export { TradeRepo } from "./repositories/trade.repo"
// export { CandleRepo } from "./repositories/candle.repo"
