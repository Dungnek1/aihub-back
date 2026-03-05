/*
  Warnings:

  - You are about to drop the column `code` on the `prices` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "prices_code_key";

-- AlterTable
ALTER TABLE "prices" DROP COLUMN "code";
