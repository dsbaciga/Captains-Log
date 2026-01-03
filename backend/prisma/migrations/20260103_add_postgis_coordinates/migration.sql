-- AlterTable
ALTER TABLE "locations" ADD COLUMN "coordinates" geography(Point, 4326);

-- AlterTable
ALTER TABLE "photos" ADD COLUMN "coordinates" geography(Point, 4326);

-- CreateIndex
CREATE INDEX "locations_coordinates_idx" ON "locations" USING GIST ("coordinates");

-- CreateIndex
CREATE INDEX "photos_coordinates_idx" ON "photos" USING GIST ("coordinates");

