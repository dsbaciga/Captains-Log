-- Add dietary_preferences column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dietary_preferences" JSONB NOT NULL DEFAULT '[]';

-- Add dietary_preferences column to travel_companions table
ALTER TABLE "travel_companions" ADD COLUMN IF NOT EXISTS "dietary_preferences" JSONB NOT NULL DEFAULT '[]';

-- Add dietary_tags column to activities table
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "dietary_tags" JSONB;
