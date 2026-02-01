-- Add missing timezone columns (may already exist in some installations)
ALTER TABLE "lodging" ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(100);
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(100);

-- Add missing activity columns (may already exist in some installations)
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "all_day" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "booking_url" VARCHAR(500);
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "booking_reference" VARCHAR(255);
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3);
