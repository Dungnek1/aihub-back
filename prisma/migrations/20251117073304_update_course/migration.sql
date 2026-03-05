/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `courses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `price_id` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `courses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "bodyHtml" TEXT,
ADD COLUMN     "price_id" TEXT NOT NULL,
ADD COLUMN     "seo" JSONB,
ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "course_ratings" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "comment" TEXT,
    "content_quality" INTEGER,
    "instructor_quality" INTEGER,
    "learning_outcome" INTEGER,
    "materials_quality" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "course_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_ratings_course_id_idx" ON "course_ratings"("course_id");

-- CreateIndex
CREATE INDEX "course_ratings_user_id_idx" ON "course_ratings"("user_id");

-- CreateIndex
CREATE INDEX "course_ratings_rating_idx" ON "course_ratings"("rating");

-- CreateIndex
CREATE INDEX "course_ratings_created_at_idx" ON "course_ratings"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "course_ratings_course_id_user_id_key" ON "course_ratings"("course_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "courses_price_id_idx" ON "courses"("price_id");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_ratings" ADD CONSTRAINT "course_ratings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_ratings" ADD CONSTRAINT "course_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
