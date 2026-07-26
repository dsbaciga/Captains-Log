-- Weather cache: one row per (trip, date).
--
-- `weather.service.ts` looks the cache up by (tripId, date) and updates the found
-- row in place, but nothing in the database enforced that key, so two concurrent
-- requests for the same trip-day could both miss and both INSERT.
--
-- `location_id` is deliberately NOT part of the key: it is a mutable attribute of
-- the cached row (the day's representative location can change between refreshes
-- and the service overwrites it), so including it would let a location change
-- re-introduce duplicate rows for the same day.
--
-- SAFE ON A POPULATED DATABASE: duplicates that already exist are removed first,
-- keeping the most recently fetched row per (trip_id, date). Weather rows are a
-- derived cache — a discarded row is re-fetched from the API on demand.

-- Step 1: de-duplicate. Keep the row with the greatest (fetched_at, id) per key.
DELETE FROM "weather_data" a
USING "weather_data" b
WHERE a."trip_id" = b."trip_id"
  AND a."date" = b."date"
  AND (a."fetched_at", a."id") < (b."fetched_at", b."id");

-- Step 2: enforce the key going forward.
-- IF NOT EXISTS so this is a no-op on a database provisioned from 00000000000000_init,
-- which already contains this index.
CREATE UNIQUE INDEX IF NOT EXISTS "weather_data_trip_id_date_key"
  ON "weather_data"("trip_id", "date");
