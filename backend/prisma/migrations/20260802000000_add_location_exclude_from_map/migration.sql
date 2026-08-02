-- Add flag to hide a location from trip maps (markers and auto-fit bounds/zoom)
ALTER TABLE "locations" ADD COLUMN "exclude_from_map" BOOLEAN NOT NULL DEFAULT false;
