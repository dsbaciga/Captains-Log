-- `expense.service.ts` lists expenses with `WHERE trip_id = $1 ORDER BY date DESC,
-- created_at DESC`, but only `trip_id` was indexed, forcing an in-memory sort.
-- Matches the existing convention: photos(trip_id, taken_at), journal_entries(trip_id, date).
--
-- SAFE ON A POPULATED DATABASE: adding an index is non-destructive. IF NOT EXISTS
-- so this is a no-op on a database provisioned from 00000000000000_init.
--
-- NOTE: this takes a brief ACCESS EXCLUSIVE lock on "trip_expenses" (a small table).
-- If that is ever a concern, run the CONCURRENTLY form by hand instead and mark this
-- migration resolved-as-applied; CREATE INDEX CONCURRENTLY cannot run inside the
-- transaction Prisma wraps migrations in.
CREATE INDEX IF NOT EXISTS "trip_expenses_trip_id_date_idx"
  ON "trip_expenses"("trip_id", "date");
