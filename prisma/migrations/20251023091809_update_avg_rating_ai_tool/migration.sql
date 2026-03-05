/*
  Warnings:

  - Made the column `avg_rating` on table `ai_tools` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ai_tools" ALTER COLUMN "avg_rating" SET NOT NULL;
