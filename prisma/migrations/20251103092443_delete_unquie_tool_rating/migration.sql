-- DropIndex
DROP INDEX "tool_ratings_tool_id_user_id_key";

-- CreateIndex
CREATE INDEX "tool_ratings_tool_id_user_id_idx" ON "tool_ratings"("tool_id", "user_id");
