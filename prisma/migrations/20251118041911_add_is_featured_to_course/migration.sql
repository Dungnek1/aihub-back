-- AlterTable: Add is_featured column to courses table
-- Default value is true to mark all existing courses as featured by default
ALTER TABLE "courses" ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex: Create index for filtering featured courses efficiently
CREATE INDEX "courses_is_featured_idx" ON "courses"("is_featured");
