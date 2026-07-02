import { prisma } from "../client.js";

export const UserRepo = {
  findById: async (user_id: string) => {
    return prisma.user.findUnique({ where: { user_id } });
  },

  findByEmail: async (email: string) => {
    return prisma.user.findUnique({ where: { email } });
  },

  create: async (data: {
    user_id: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    age: number;
    phone: string;
  }) => {
    return prisma.user.create({ data });
  },
};
