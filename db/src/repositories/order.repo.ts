import { prisma } from "../client.js";
import { Prisma } from "@prisma/client";

export const OrderRepo = {
  findById: async (order_id: string) => {
    return prisma.order.findUnique({ where: { order_id } });
  },

  create: async (data: {
    order_id: string;
    user_id: string;
    side: string;
    type: string;
    quantity: Prisma.Decimal;
    filled_quantity: Prisma.Decimal;
    price: Prisma.Decimal;
    status: string;
    base_asset: string;
    quote_asset: string;
  }) => {
    return prisma.order.create({ data });
  },
};
