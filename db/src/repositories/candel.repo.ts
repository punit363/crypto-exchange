import { prisma } from "../client.js";
import { Prisma } from "@prisma/client";

export const CancelRepo = {
  findById: async (candle_id: string) => {
    return prisma.candle.findUnique({ where: { candle_id } });
  },

  create: async (data: {
    candle_id: string;
    interval: string;
    user_id: string;
    base_asset: string;
    quote_asset: string;
    open: Prisma.Decimal;
    high: Prisma.Decimal;
    low: Prisma.Decimal;
    close: Prisma.Decimal;
    volume: Prisma.Decimal;
  }) => {
    return prisma.candle.create({ data });
  },
};
