-- CreateTable
CREATE TABLE "user_course_usages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 1,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "user_course_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tool_marketing_usages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tool_marketing_id" TEXT NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 1,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "user_tool_marketing_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_saved_courses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "user_saved_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_saved_tool_marketings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tool_marketing_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "user_saved_tool_marketings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_course_usages_user_id_idx" ON "user_course_usages"("user_id");

-- CreateIndex
CREATE INDEX "user_course_usages_course_id_idx" ON "user_course_usages"("course_id");

-- CreateIndex
CREATE INDEX "user_course_usages_last_used_at_idx" ON "user_course_usages"("last_used_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_course_usages_user_id_course_id_key" ON "user_course_usages"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "user_tool_marketing_usages_user_id_idx" ON "user_tool_marketing_usages"("user_id");

-- CreateIndex
CREATE INDEX "user_tool_marketing_usages_tool_marketing_id_idx" ON "user_tool_marketing_usages"("tool_marketing_id");

-- CreateIndex
CREATE INDEX "user_tool_marketing_usages_last_used_at_idx" ON "user_tool_marketing_usages"("last_used_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_tool_marketing_usages_user_id_tool_marketing_id_key" ON "user_tool_marketing_usages"("user_id", "tool_marketing_id");

-- CreateIndex
CREATE INDEX "user_saved_courses_user_id_idx" ON "user_saved_courses"("user_id");

-- CreateIndex
CREATE INDEX "user_saved_courses_course_id_idx" ON "user_saved_courses"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_saved_courses_user_id_course_id_key" ON "user_saved_courses"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "user_saved_tool_marketings_user_id_idx" ON "user_saved_tool_marketings"("user_id");

-- CreateIndex
CREATE INDEX "user_saved_tool_marketings_tool_marketing_id_idx" ON "user_saved_tool_marketings"("tool_marketing_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_saved_tool_marketings_user_id_tool_marketing_id_key" ON "user_saved_tool_marketings"("user_id", "tool_marketing_id");

-- AddForeignKey
ALTER TABLE "user_course_usages" ADD CONSTRAINT "user_course_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_course_usages" ADD CONSTRAINT "user_course_usages_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tool_marketing_usages" ADD CONSTRAINT "user_tool_marketing_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tool_marketing_usages" ADD CONSTRAINT "user_tool_marketing_usages_tool_marketing_id_fkey" FOREIGN KEY ("tool_marketing_id") REFERENCES "tool_marketings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_saved_courses" ADD CONSTRAINT "user_saved_courses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_saved_courses" ADD CONSTRAINT "user_saved_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_saved_tool_marketings" ADD CONSTRAINT "user_saved_tool_marketings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_saved_tool_marketings" ADD CONSTRAINT "user_saved_tool_marketings_tool_marketing_id_fkey" FOREIGN KEY ("tool_marketing_id") REFERENCES "tool_marketings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
