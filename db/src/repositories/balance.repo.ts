import { prisma } from "../client.js";
import { Prisma } from "@prisma/client";

export const BalanceLedgerRepo = {
  findById: async (id: string) => {
    return prisma.balanceLedger.findUnique({ where: { id } });
  },

  create: async (data: {
    id: string;
    user_id: string;
    asset: string;
    amount: Prisma.Decimal;
    type: string;
    status: string;
    ref_id: string;
  }) => {
    return prisma.balanceLedger.create({ data });
  },
};
