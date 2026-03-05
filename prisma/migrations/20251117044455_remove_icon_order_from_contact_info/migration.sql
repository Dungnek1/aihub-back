-- AlterTable
ALTER TABLE "support_contact_requests" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- CreateTable
CREATE TABLE "support_contact_info" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "support_contact_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_contact_info_category_id_idx" ON "support_contact_info"("category_id");

-- CreateIndex
CREATE INDEX "support_contact_info_type_idx" ON "support_contact_info"("type");

-- AddForeignKey
ALTER TABLE "support_contact_info" ADD CONSTRAINT "support_contact_info_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "support_issue_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
