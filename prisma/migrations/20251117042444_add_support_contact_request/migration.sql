-- CreateTable
CREATE TABLE "support_contact_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "support_contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_contact_requests_status_idx" ON "support_contact_requests"("status");

-- CreateIndex
CREATE INDEX "support_contact_requests_email_idx" ON "support_contact_requests"("email");

-- CreateIndex
CREATE INDEX "support_contact_requests_created_at_idx" ON "support_contact_requests"("created_at");
