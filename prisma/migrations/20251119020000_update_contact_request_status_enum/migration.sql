-- CreateEnum
CREATE TYPE "ContactRequestStatus" AS ENUM ('NEW', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED', 'CONTACTED');

-- Migrate existing data: Convert old string values to new enum values
-- PENDING -> PENDING (keep as is)
-- CONTACTED -> CONTACTED (keep as is)  
-- RESOLVED -> RESOLVED (keep as is)
-- Any other values -> NEW (default)

-- Step 1: Add new column with enum type
ALTER TABLE "support_contact_requests" ADD COLUMN "status_new" "ContactRequestStatus" DEFAULT 'NEW';

-- Step 2: Migrate data
UPDATE "support_contact_requests" 
SET "status_new" = CASE 
    WHEN "status" = 'PENDING' THEN 'PENDING'::"ContactRequestStatus"
    WHEN "status" = 'CONTACTED' THEN 'CONTACTED'::"ContactRequestStatus"
    WHEN "status" = 'RESOLVED' THEN 'RESOLVED'::"ContactRequestStatus"
    ELSE 'NEW'::"ContactRequestStatus"
END;

-- Step 3: Drop old column
ALTER TABLE "support_contact_requests" DROP COLUMN "status";

-- Step 4: Rename new column to original name
ALTER TABLE "support_contact_requests" RENAME COLUMN "status_new" TO "status";

-- Step 5: Set NOT NULL constraint
ALTER TABLE "support_contact_requests" ALTER COLUMN "status" SET NOT NULL;

-- Step 6: Set default value
ALTER TABLE "support_contact_requests" ALTER COLUMN "status" SET DEFAULT 'NEW'::"ContactRequestStatus";

