//Initiating db

import { verifyConnection } from "./client.js";
import RedisHandler from "./redis.js";
import { OrderRepo } from "./repositories/order.repo.js";
import {
  Balance,
  Candle,
  Order,
  Trade,
  Transaction,
  User,
} from "./types/types.js";

const dbMain = async () => {
  await verifyConnection();
  const redis = await RedisHandler.createInstance();
  while (true) {
    const response = await redis.getTradeDetail();
    console.log("response-data----------------------", response);

    if (response) {
      const db_data: {
        action: string;
        order?: Order;
        trade?: Trade;
        transaction?: Transaction;
        balance?: Balance;
        user?: User;
        candle?: Candle;
      } = JSON.parse(response.element);
      console.log("action-data----------------------", db_data.action);

      switch (db_data.action) {
        case "PLACE_ORDER": {
          const order_data = db_data.order;
          console.log("order-data----------------------", order_data);
          if (order_data) {
            await OrderRepo.create(order_data);
          } else {
            throw Error("Order Data not Found");
          }
        }
      }
    }
  }
};

dbMain();

export { prisma } from "./client.js";
// export { UserRepo } from "./repositories/user.repo"
// export { OrderRepo } from "./repositories/order.repo"
// export { TradeRepo } from "./repositories/trade.repo"
// export { CandleRepo } from "./repositories/candle.repo"
