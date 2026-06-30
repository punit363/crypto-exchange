// prisma/seed.ts
import { prisma } from ".."
import { seedAssets } from "./01_asset.seed"

async function main() {
  await seedAssets()
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())