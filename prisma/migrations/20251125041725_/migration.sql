/*
  Warnings:

  - You are about to drop the column `rating` on the `tool_ratings` table. All the data in the column will be lost.
  - Added the required column `stars` to the `tool_ratings` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "tool_ratings_tool_id_user_id_key";

-- AlterTable
ALTER TABLE "tool_ratings" DROP COLUMN "rating",
ADD COLUMN     "stars" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "support_contact_requests_status_idx" ON "support_contact_requests"("status");

-- CreateIndex
CREATE INDEX "tool_ratings_tool_id_user_id_idx" ON "tool_ratings"("tool_id", "user_id");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "status_feed_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
