-- Add public share link support for trips
ALTER TABLE "trips" ADD COLUMN "share_token" VARCHAR(64);
ALTER TABLE "trips" ADD COLUMN "share_enabled" BOOLEAN NOT NULL DEFAULT false;

-- One share token maps to exactly one trip
CREATE UNIQUE INDEX "trips_share_token_key" ON "trips"("share_token");
