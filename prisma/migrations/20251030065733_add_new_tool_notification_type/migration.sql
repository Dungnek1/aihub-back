-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'new_tool';

-- AddForeignKey
ALTER TABLE "status_feed_attachments" ADD CONSTRAINT "status_feed_attachments_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
