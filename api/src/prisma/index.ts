import dotenv from "dotenv";
import path from "path";

// 1. Tell Node where the external .env file is located FIRST
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// 2. Now process.env.DATABASE_URL will successfully load the variable
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Check your .env path!");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const allUsers = await prisma.user.findMany();
  console.log("All Users in DB:", allUsers);
}

main()
  .catch((e: Error) => {
    console.error("Connection error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { prisma };
