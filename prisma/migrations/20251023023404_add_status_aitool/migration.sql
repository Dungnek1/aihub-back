-- CreateEnum
CREATE TYPE "StatusAiTool" AS ENUM ('PAID', 'TRIAL');

-- AlterTable
ALTER TABLE "ai_tools" ADD COLUMN     "status" "StatusAiTool" NOT NULL DEFAULT 'PAID';
