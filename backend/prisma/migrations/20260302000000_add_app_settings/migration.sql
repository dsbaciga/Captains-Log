-- CreateTable
CREATE TABLE "app_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "gmail_client_id" VARCHAR(500),
    "gmail_client_secret" VARCHAR(500),
    "gmail_refresh_token" TEXT,
    "gmail_inbox_email" VARCHAR(255),
    "llm_base_url" VARCHAR(500),
    "llm_api_key" VARCHAR(500),
    "llm_model" VARCHAR(100),
    "email_import_enabled" BOOLEAN NOT NULL DEFAULT false,
    "email_import_poll_interval" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton row
INSERT INTO "app_settings" ("id", "updated_at") VALUES (1, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
