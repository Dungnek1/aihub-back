-- CreateTable
CREATE TABLE "tool_marketings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "short_desc" TEXT,
    "description" TEXT,
    "instructor_id" TEXT NOT NULL,
    "thumbnail" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "slug" TEXT NOT NULL,
    "price_id" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "seo" JSONB,
    "is_featured" BOOLEAN NOT NULL DEFAULT true,
    "chapter_count" INTEGER NOT NULL DEFAULT 0,
    "lesson_count" INTEGER NOT NULL DEFAULT 0,
    "document_count" INTEGER NOT NULL DEFAULT 0,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "reactions_count" INTEGER NOT NULL DEFAULT 0,
    "shares_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "avg_rating" DECIMAL(65,30) DEFAULT 0.0,
    "ratings_count" INTEGER NOT NULL DEFAULT 0,
    "cover_image_id" TEXT,
    "category_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "tool_marketings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_marketing_ratings" (
    "id" TEXT NOT NULL,
    "tool_marketing_id" TEXT NOT NULL,
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

    CONSTRAINT "tool_marketing_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tool_marketings_slug_key" ON "tool_marketings"("slug");

-- CreateIndex
CREATE INDEX "tool_marketings_instructor_id_idx" ON "tool_marketings"("instructor_id");

-- CreateIndex
CREATE INDEX "tool_marketings_price_id_idx" ON "tool_marketings"("price_id");

-- CreateIndex
CREATE INDEX "tool_marketings_status_idx" ON "tool_marketings"("status");

-- CreateIndex
CREATE INDEX "tool_marketings_created_at_idx" ON "tool_marketings"("created_at");

-- CreateIndex
CREATE INDEX "tool_marketings_is_featured_idx" ON "tool_marketings"("is_featured");

-- CreateIndex
CREATE INDEX "tool_marketing_ratings_tool_marketing_id_idx" ON "tool_marketing_ratings"("tool_marketing_id");

-- CreateIndex
CREATE INDEX "tool_marketing_ratings_user_id_idx" ON "tool_marketing_ratings"("user_id");

-- CreateIndex
CREATE INDEX "tool_marketing_ratings_rating_idx" ON "tool_marketing_ratings"("rating");

-- CreateIndex
CREATE INDEX "tool_marketing_ratings_created_at_idx" ON "tool_marketing_ratings"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tool_marketing_ratings_tool_marketing_id_user_id_key" ON "tool_marketing_ratings"("tool_marketing_id", "user_id");

-- AddForeignKey
ALTER TABLE "tool_marketings" ADD CONSTRAINT "tool_marketings_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_marketings" ADD CONSTRAINT "tool_marketings_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_marketings" ADD CONSTRAINT "tool_marketings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_marketings" ADD CONSTRAINT "tool_marketings_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "status_feed_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_marketing_ratings" ADD CONSTRAINT "tool_marketing_ratings_tool_marketing_id_fkey" FOREIGN KEY ("tool_marketing_id") REFERENCES "tool_marketings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_marketing_ratings" ADD CONSTRAINT "tool_marketing_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
