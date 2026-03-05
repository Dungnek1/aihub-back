/*
  Warnings:

  - You are about to drop the column `price` on the `ai_tools` table. All the data in the column will be lost.
  - The `status` column on the `ai_tools` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `user_saved_tools` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_tool_usage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "user_saved_tools" DROP CONSTRAINT "user_saved_tools_tool_id_fkey";

-- DropForeignKey
ALTER TABLE "user_saved_tools" DROP CONSTRAINT "user_saved_tools_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_tool_usage" DROP CONSTRAINT "user_tool_usage_tool_id_fkey";

-- DropForeignKey
ALTER TABLE "user_tool_usage" DROP CONSTRAINT "user_tool_usage_user_id_fkey";

-- AlterTable
ALTER TABLE "ai_tools" DROP COLUMN "price",
ALTER COLUMN "avg_rating" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "StatusAiTool" NOT NULL DEFAULT 'PAID';

-- DropTable
DROP TABLE "user_saved_tools";

-- DropTable
DROP TABLE "user_tool_usage";

-- CreateTable
CREATE TABLE "audiences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_audiences" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "audience_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "tool_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audiences_name_key" ON "audiences"("name");

-- CreateIndex
CREATE INDEX "tool_audiences_tool_id_idx" ON "tool_audiences"("tool_id");

-- CreateIndex
CREATE INDEX "tool_audiences_audience_id_idx" ON "tool_audiences"("audience_id");

-- CreateIndex
CREATE UNIQUE INDEX "tool_audiences_tool_id_audience_id_key" ON "tool_audiences"("tool_id", "audience_id");

-- AddForeignKey
ALTER TABLE "tool_audiences" ADD CONSTRAINT "tool_audiences_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "ai_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_audiences" ADD CONSTRAINT "tool_audiences_audience_id_fkey" FOREIGN KEY ("audience_id") REFERENCES "audiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
