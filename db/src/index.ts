//Initiating db

import RedisHandler from "./redis";

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
