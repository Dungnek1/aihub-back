/*
  Warnings:

  - You are about to drop the column `price` on the `ai_tools` table. All the data in the column will be lost.
  - Added the required column `price_id` to the `ai_tools` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "prices" (
    "id" TEXT NOT NULL,
    "name" "StatusAiTool" NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prices_name_key" ON "prices"("name");

-- CreateIndex
CREATE UNIQUE INDEX "prices_code_key" ON "prices"("code");

-- Insert price data
INSERT INTO "prices" ("id", "name", "code", "created_at", "updated_at") VALUES
('price_paid', 'PAID', 'PAID', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('price_trial', 'TRIAL', 'TRIAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "ai_tools" ADD COLUMN     "price_id" TEXT;

-- Update existing data to use PAID price
UPDATE "ai_tools" SET "price_id" = 'price_paid' WHERE "price_id" IS NULL;

-- Make price_id NOT NULL
ALTER TABLE "ai_tools" ALTER COLUMN "price_id" SET NOT NULL;

-- Drop old price column
ALTER TABLE "ai_tools" DROP COLUMN "price";

-- AddForeignKey
ALTER TABLE "ai_tools" ADD CONSTRAINT "ai_tools_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
