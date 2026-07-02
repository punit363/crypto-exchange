/*
  Warnings:

  - You are about to drop the column `asset` on the `holdings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id,asset_symbol]` on the table `holdings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `asset_symbol` to the `holdings` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "holdings_user_id_asset_key";

-- AlterTable
ALTER TABLE "holdings" DROP COLUMN "asset",
ADD COLUMN     "asset_symbol" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "assets" (
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "current_price" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("symbol")
);

-- CreateIndex
CREATE UNIQUE INDEX "holdings_user_id_asset_symbol_key" ON "holdings"("user_id", "asset_symbol");

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_asset_symbol_fkey" FOREIGN KEY ("asset_symbol") REFERENCES "assets"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;
