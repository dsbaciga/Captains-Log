-- One-time backfill of the PostGIS `coordinates` column.
--
-- 20260103_add_postgis_coordinates added `coordinates geography(Point, 4326)` to
-- "locations" and "photos" plus their GiST indexes, but never backfilled it from the
-- existing `latitude`/`longitude` columns. Sync-on-write lives only in the Prisma
-- client extension (`src/config/prismaExtensions.ts`), so every row written before
-- that migration and not edited since has lat/lng but a NULL `coordinates`.
--
-- Column names verified against schema.prisma: both "locations" and "photos" have
-- unmapped `latitude` / `longitude` Decimal columns and a `coordinates` column.
--
-- SAFE ON A POPULATED DATABASE:
--   * Only rows that already have lat/lng AND a NULL coordinates are touched, so it
--     never overwrites a value written by the application extension.
--   * No schema change, no data loss; re-running is a no-op (the WHERE clause matches
--     nothing the second time). On a fresh database both tables are empty.
--   * Cost is one pass per table plus GiST index maintenance for the updated rows.
--     Personal-scale tables; if these ever grow large, run it in id-range batches
--     outside a migration instead.

UPDATE "locations"
SET "coordinates" = ST_SetSRID(ST_MakePoint("longitude"::float8, "latitude"::float8), 4326)::geography
WHERE "latitude" IS NOT NULL
  AND "longitude" IS NOT NULL
  AND "coordinates" IS NULL;

UPDATE "photos"
SET "coordinates" = ST_SetSRID(ST_MakePoint("longitude"::float8, "latitude"::float8), 4326)::geography
WHERE "latitude" IS NOT NULL
  AND "longitude" IS NOT NULL
  AND "coordinates" IS NULL;
