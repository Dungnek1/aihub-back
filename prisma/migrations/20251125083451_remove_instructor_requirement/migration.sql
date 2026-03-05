-- DropIndex
DROP INDEX "courses_instructor_id_idx";

-- DropIndex
DROP INDEX "tool_marketings_instructor_id_idx";

-- AlterTable
ALTER TABLE "courses" ALTER COLUMN "instructor_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tool_marketings" ALTER COLUMN "instructor_id" DROP NOT NULL;
