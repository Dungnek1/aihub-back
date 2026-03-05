-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "cover_image_id" TEXT;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "status_feed_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
