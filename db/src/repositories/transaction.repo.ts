import { prisma } from "../client.js";
import { Prisma } from "@prisma/client";

export const TransactionRepo = {
  findById: async (tx_id: string) => {
    return prisma.transaction.findUnique({ where: { tx_id } });
  },

  create: async (data: {
    tx_id: string;
    user_id: string;
    type: string;
    asset: string;
    amount: Prisma.Decimal;
    status: string;
  }) => {
    return prisma.transaction.create({ data });
  },
};
