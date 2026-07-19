-- Add trip archiving flag
ALTER TABLE "trips" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- Add favorite flag to locations
ALTER TABLE "locations" ADD COLUMN "is_favorite" BOOLEAN NOT NULL DEFAULT false;
