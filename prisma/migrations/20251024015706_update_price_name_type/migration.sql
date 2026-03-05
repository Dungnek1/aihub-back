/*
  Warnings:

  - Changed the type of `name` on the `prices` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `created_by` on table `prices` required. This step will fail if there are existing NULL values in that column.

*/
-- Update existing NULL created_by values to a default user ID
UPDATE "prices" SET "created_by" = 'system' WHERE "created_by" IS NULL;

-- AlterTable
ALTER TABLE "prices" ALTER COLUMN "name" TYPE TEXT;
ALTER TABLE "prices" ALTER COLUMN "created_by" SET NOT NULL;

-- DropEnum
DROP TYPE "StatusAiTool";
