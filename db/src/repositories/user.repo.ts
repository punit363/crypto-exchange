import { prisma } from "../client.js";
import { User } from "../types/types.js";

export const UserRepo = {
  findById: async (user_id: string) => {
    return prisma.user.findUnique({ where: { user_id } });
  },

  findByEmail: async (email: string) => {
    return prisma.user.findUnique({ where: { email } });
  },

  create: async (data:User) => {
    return prisma.user.create({ data });
  },
};
