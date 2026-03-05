/*
  Warnings:

  - You are about to drop the column `type` on the `support_contact_info` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "support_contact_info_type_idx";

-- AlterTable
ALTER TABLE "support_contact_info" DROP COLUMN "type";
