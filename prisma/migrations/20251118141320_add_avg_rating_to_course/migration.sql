-- AlterTable: Add avgRating and ratingsCount to courses table
ALTER TABLE "courses" ADD COLUMN     "avg_rating" DECIMAL(65,30) DEFAULT 0.0,
ADD COLUMN     "ratings_count" INTEGER NOT NULL DEFAULT 0;

