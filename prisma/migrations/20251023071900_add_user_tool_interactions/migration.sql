-- CreateTable
CREATE TABLE "user_tool_usage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usage_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "user_tool_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_saved_tools" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "user_saved_tools_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_tool_usage_user_id_idx" ON "user_tool_usage"("user_id");

-- CreateIndex
CREATE INDEX "user_tool_usage_tool_id_idx" ON "user_tool_usage"("tool_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_tool_usage_user_id_tool_id_key" ON "user_tool_usage"("user_id", "tool_id");

-- CreateIndex
CREATE INDEX "user_saved_tools_user_id_idx" ON "user_saved_tools"("user_id");

-- CreateIndex
CREATE INDEX "user_saved_tools_tool_id_idx" ON "user_saved_tools"("tool_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_saved_tools_user_id_tool_id_key" ON "user_saved_tools"("user_id", "tool_id");

-- AddForeignKey
ALTER TABLE "user_tool_usage" ADD CONSTRAINT "user_tool_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tool_usage" ADD CONSTRAINT "user_tool_usage_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "ai_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_saved_tools" ADD CONSTRAINT "user_saved_tools_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_saved_tools" ADD CONSTRAINT "user_saved_tools_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "ai_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
