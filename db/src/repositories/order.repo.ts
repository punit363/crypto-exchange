import { prisma } from "../client.js";
import { Prisma } from "@prisma/client";
import { Order } from "../types/types.js";

export const OrderRepo = {
  findById: async (order_id: string) => {
    return prisma.order.findUnique({ where: { order_id } });
  },

  create: async (data: Order) => {
    return prisma.order.create({ data });
  },
};
