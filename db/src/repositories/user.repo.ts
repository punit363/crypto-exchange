import { prisma } from "../client.js";
import { User } from "../types/types.js";

export const UserRepo = {
  findById: async (user_id: string) => {
    return prisma.user.findUnique({
      where: { user_id },
      select: {
        user_id: true,
        first_name: true,
        last_name: true,
        email: true,
        age: true,
        phone: true,
      },
    });
  },

  findByEmail: async (email: string) => {
    return prisma.user.findUnique({ where: { email } });
  },

  create: async (data: User) => {
    return prisma.user.create({ data });
  },

  updateRefreshToken: async (user_id: string, refresh_token: string) => {
    return prisma.user.update({
      where: { user_id },
      data: { refresh_token },
    });
  },

  fetchRefreshToken: async (refresh_token: string) => {
    return prisma.user.findFirst({
      where: { refresh_token },
    });
  },
};
