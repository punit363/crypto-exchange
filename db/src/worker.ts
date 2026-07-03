import { verifyConnection } from "./client.js";
import RedisHandler from "./redis.js";
import { OrderRepo } from "./repositories/order.repo.js";
import { TradeRepo } from "./repositories/trade.repo.js";
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
        trades?: Trade[];
        transaction?: Transaction;
        balance?: Balance;
        user?: User;
        candle?: Candle;
      } = JSON.parse(response.element);
      console.log("action-data----------------------", db_data.action);

      switch (db_data.action) {
        case "ADD_ORDER": {
          const order_data = db_data.order;
          console.log("order-data----------------------", order_data);
          if (order_data) {
            await OrderRepo.create(order_data);
          } else {
            throw Error("Order Data not Found");
          }
          break;
        }
        case "ADD_TRADES": {
          const trade_data = db_data.trades;
          console.log("trade-data----------------------", trade_data);
          if (trade_data) {
            console.log("trade-data----------------------2", trade_data);
            for (const trade of trade_data) {
              await TradeRepo.create(trade);
            }
          } else {
            throw Error("Trade Data not Found");
          }
          break;
        }
      }
    }
  }
};

dbMain();
