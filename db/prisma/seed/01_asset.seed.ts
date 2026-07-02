import { prisma } from "../../src/client";

export async function seedAssets() {
  // Upsert to avoid duplicates on re-runs
  await prisma.asset.createMany({
    data: [
      { symbol: "BTC", name: "Bitcoin", current_price: 65000.0 },
      { symbol: "ETH", name: "Ethereum", current_price: 3500.0 },
      { symbol: "DOGE", name: "Doge Coin", current_price: 1.0 },
    ],
    skipDuplicates: true,
  });
  console.log("Assets seeded ✓");
}
