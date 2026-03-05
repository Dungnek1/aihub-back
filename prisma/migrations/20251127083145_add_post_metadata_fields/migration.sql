-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "author_name" TEXT,
ADD COLUMN     "excerpt" TEXT,
ADD COLUMN     "published_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "posts_published_at_idx" ON "posts"("published_at");
