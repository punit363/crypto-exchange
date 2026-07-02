import { prisma } from "../client.js";
import { Prisma } from '@prisma/client'

export const TradeRepo = {
  findById: async (trade_id: string) => {
    return prisma.trade.findUnique({ where: { trade_id } });
  },

  create: async (data: {
    trade_id: string;
    user_id: string;
    other_user_id: string;
    order_id: string;
    other_order_id: string;
    quantity: Prisma.Decimal;
    price: Prisma.Decimal;
    base_asset: string;
    quote_asset: string;
    side: string;
  }) => {
    return prisma.trade.create({ data });
  },
};
