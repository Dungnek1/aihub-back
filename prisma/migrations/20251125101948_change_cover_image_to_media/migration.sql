-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_cover_image_id_fkey";

-- DropForeignKey
ALTER TABLE "tool_marketings" DROP CONSTRAINT "tool_marketings_cover_image_id_fkey";

-- Convert Attachment ID to Media ID for courses
-- Update courses: set cover_image_id to mediaId from StatusFeedAttachment
UPDATE "courses" 
SET "cover_image_id" = (
    SELECT "mediaId" 
    FROM "status_feed_attachments" 
    WHERE "status_feed_attachments"."id" = "courses"."cover_image_id"
)
WHERE "cover_image_id" IS NOT NULL 
AND EXISTS (
    SELECT 1 
    FROM "status_feed_attachments" 
    WHERE "status_feed_attachments"."id" = "courses"."cover_image_id"
    AND "status_feed_attachments"."mediaId" IS NOT NULL
);

-- Convert Attachment ID to Media ID for tool_marketings
-- Update tool_marketings: set cover_image_id to mediaId from StatusFeedAttachment
UPDATE "tool_marketings" 
SET "cover_image_id" = (
    SELECT "mediaId" 
    FROM "status_feed_attachments" 
    WHERE "status_feed_attachments"."id" = "tool_marketings"."cover_image_id"
)
WHERE "cover_image_id" IS NOT NULL 
AND EXISTS (
    SELECT 1 
    FROM "status_feed_attachments" 
    WHERE "status_feed_attachments"."id" = "tool_marketings"."cover_image_id"
    AND "status_feed_attachments"."mediaId" IS NOT NULL
);

-- Set to NULL if mediaId is NULL in StatusFeedAttachment or attachment doesn't exist
UPDATE "courses" 
SET "cover_image_id" = NULL
WHERE "cover_image_id" IS NOT NULL 
AND (
    NOT EXISTS (
        SELECT 1 
        FROM "status_feed_attachments" 
        WHERE "status_feed_attachments"."id" = "courses"."cover_image_id"
    )
    OR EXISTS (
        SELECT 1 
        FROM "status_feed_attachments" 
        WHERE "status_feed_attachments"."id" = "courses"."cover_image_id"
        AND "status_feed_attachments"."mediaId" IS NULL
    )
);

UPDATE "tool_marketings" 
SET "cover_image_id" = NULL
WHERE "cover_image_id" IS NOT NULL 
AND (
    NOT EXISTS (
        SELECT 1 
        FROM "status_feed_attachments" 
        WHERE "status_feed_attachments"."id" = "tool_marketings"."cover_image_id"
    )
    OR EXISTS (
        SELECT 1 
        FROM "status_feed_attachments" 
        WHERE "status_feed_attachments"."id" = "tool_marketings"."cover_image_id"
        AND "status_feed_attachments"."mediaId" IS NULL
    )
);

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_marketings" ADD CONSTRAINT "tool_marketings_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
