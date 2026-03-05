/*
  Warnings:

  - You are about to drop the column `body_html` on the `ai_tools` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ai_tools" DROP COLUMN "body_html",
ADD COLUMN     "bodyHtml" TEXT;
