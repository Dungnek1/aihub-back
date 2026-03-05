/*
  Warnings:

  - You are about to drop the column `stars` on the `tool_ratings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tool_id,user_id]` on the table `tool_ratings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `rating` to the `tool_ratings` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "tool_ratings_tool_id_user_id_idx";

-- AlterTable
ALTER TABLE "tool_ratings" DROP COLUMN "stars",
ADD COLUMN     "comment" TEXT,
ADD COLUMN     "content_quality" INTEGER,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT,
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "instructor_quality" INTEGER,
ADD COLUMN     "learning_outcome" INTEGER,
ADD COLUMN     "materials_quality" INTEGER,
ADD COLUMN     "rating" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tool_ratings_tool_id_user_id_key" ON "tool_ratings"("tool_id", "user_id");
