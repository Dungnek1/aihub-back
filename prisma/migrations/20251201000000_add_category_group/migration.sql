-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "CategoryGroup" AS ENUM ('ALL', 'BLOG', 'TOOL', 'TOOL_MARKETING', 'COURSE', 'LANDING_PAGE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' 
        AND column_name = 'group'
    ) THEN
        ALTER TABLE "categories" ADD COLUMN "group" "CategoryGroup" NOT NULL DEFAULT 'ALL';
    END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "categories_group_idx" ON "categories"("group");

