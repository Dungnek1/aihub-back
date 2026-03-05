/*
  Warnings:

  - The `status` column on the `ai_tools` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ai_tools" ADD COLUMN     "price" "StatusAiTool" NOT NULL DEFAULT 'PAID',
DROP COLUMN "status",
ADD COLUMN     "status" INTEGER NOT NULL DEFAULT 1;
