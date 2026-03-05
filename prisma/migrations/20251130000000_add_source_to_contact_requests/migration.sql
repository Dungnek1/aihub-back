-- CreateEnum (only if not exists)
DO $$ BEGIN
    CREATE TYPE "ContactRequestSource" AS ENUM ('HOME', 'LANDING_PAGE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable (only if column doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_contact_requests' 
        AND column_name = 'source'
    ) THEN
        ALTER TABLE "support_contact_requests" ADD COLUMN "source" "ContactRequestSource" NOT NULL DEFAULT 'HOME';
    END IF;
END $$;

-- CreateIndex (only if not exists)
CREATE INDEX IF NOT EXISTS "support_contact_requests_source_idx" ON "support_contact_requests"("source");

