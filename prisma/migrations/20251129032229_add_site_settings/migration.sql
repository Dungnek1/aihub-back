-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'site-settings',
    "site_name" TEXT,
    "site_url" TEXT,
    "site_description" TEXT,
    "contact_email" TEXT,
    "posts_per_page" INTEGER DEFAULT 10,
    "enable_comments" BOOLEAN NOT NULL DEFAULT true,
    "enable_reactions" BOOLEAN NOT NULL DEFAULT true,
    "enable_sharing" BOOLEAN NOT NULL DEFAULT true,
    "moderation_required" BOOLEAN NOT NULL DEFAULT true,
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "social_links" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);
