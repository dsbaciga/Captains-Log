-- `trip_expenses.amount` never got the non-negative CHECK its sibling cost columns
-- received in 20260220000000_add_cost_check_constraints_and_defaults
-- (activity_cost_non_negative, lodging_cost_non_negative, transportation_cost_non_negative).
-- The floor is enforced in Zod (`expense.types.ts`) but not by the database, so raw
-- SQL fixes, bulk imports and scripts can still write negative amounts.
--
-- SAFE ON A POPULATED DATABASE:
--   * The constraint is added NOT VALID, which never scans or rejects existing rows,
--     so the migration cannot fail because of legacy negative amounts.
--     NOT VALID still enforces the check on every INSERT and UPDATE from now on.
--   * It is then VALIDATEd (a lock-light scan that retro-checks existing rows) only
--     if no negative row exists. If any do, validation is skipped and the constraint
--     stays NOT VALID — see the note at the bottom of this file.
--   * Both steps are guarded, so re-running is a no-op and a database provisioned
--     from 00000000000000_init (which already has the constraint) is unaffected.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trip_expenses_amount_non_negative'
  ) THEN
    ALTER TABLE "trip_expenses"
      ADD CONSTRAINT "trip_expenses_amount_non_negative" CHECK ("amount" >= 0) NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trip_expenses_amount_non_negative' AND NOT convalidated
  ) AND NOT EXISTS (
    SELECT 1 FROM "trip_expenses" WHERE "amount" < 0
  ) THEN
    ALTER TABLE "trip_expenses" VALIDATE CONSTRAINT "trip_expenses_amount_non_negative";
  END IF;
END
$$;

-- MANUAL FOLLOW-UP (only if this database had pre-existing negative amounts):
--   SELECT id, trip_id, description, amount FROM trip_expenses WHERE amount < 0;
-- Correct or delete those rows, then finish the job with:
--   ALTER TABLE trip_expenses VALIDATE CONSTRAINT trip_expenses_amount_non_negative;
-- Until then the constraint is NOT VALID: new and updated rows are checked, the
-- historical rows are not.
