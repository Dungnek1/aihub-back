-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "locale" TEXT DEFAULT 'vi';

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "locale" TEXT DEFAULT 'vi';

-- AlterTable
ALTER TABLE "tool_marketings" ADD COLUMN     "locale" TEXT DEFAULT 'vi';

-- CreateIndex
CREATE INDEX "courses_locale_idx" ON "courses"("locale");

-- CreateIndex
CREATE INDEX "courses_slug_locale_idx" ON "courses"("slug", "locale");

-- CreateIndex
CREATE INDEX "posts_locale_idx" ON "posts"("locale");

-- CreateIndex
CREATE INDEX "posts_slug_locale_idx" ON "posts"("slug", "locale");

-- CreateIndex
CREATE INDEX "tool_marketings_locale_idx" ON "tool_marketings"("locale");

-- CreateIndex
CREATE INDEX "tool_marketings_slug_locale_idx" ON "tool_marketings"("slug", "locale");
