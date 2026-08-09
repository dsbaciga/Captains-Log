-- A location category is either a system default (user_id NULL, is_default true) or a
-- user's own category (user_id set, is_default false) -- see the `user_id` comment on
-- LocationCategory in schema.prisma. The combination user_id IS NOT NULL AND
-- is_default = true is an invalid state that no code path is supposed to produce.
--
-- The backup/restore path produced it anyway: restore.service.ts re-created every
-- backed-up category with the restoring user's id while preserving the backed-up
-- is_default flag. Because location.service.ts updateCategory and deleteCategory both
-- filter on `isDefault: false`, any such row is permanently uneditable and undeletable
-- for its owner -- a backup round-trip froze the user's categories.
--
-- restore.service.ts now forces is_default false for user-owned categories. This
-- migration repairs the rows already written by the old code and adds a CHECK so the
-- invalid state cannot be reintroduced.
--
-- SAFE ON A POPULATED DATABASE:
--   * The UPDATE only clears is_default on rows that are user-owned. System defaults
--     (user_id IS NULL) are untouched, so the shared category list is unaffected.
--   * Clearing the flag only widens what the owner may do with their own row; nothing
--     reads is_default on a user-owned category for any other purpose.
--   * The CHECK is added after the repair, so no existing row can violate it. Both
--     steps are idempotent -- re-running is a no-op.

-- Repair: hand the affected categories back to their owners.
UPDATE "location_categories"
SET "is_default" = false
WHERE "user_id" IS NOT NULL AND "is_default" = true;

-- Guard: a user-owned category can never be a system default again.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'location_categories_default_is_system_owned'
  ) THEN
    ALTER TABLE "location_categories"
      ADD CONSTRAINT "location_categories_default_is_system_owned"
      CHECK ("user_id" IS NULL OR "is_default" = false);
  END IF;
END
$$;
