-- Remove old journal linkage tables
-- These tables have been replaced by the unified EntityLink system (added in 20260114_add_entity_links)

-- Drop the junction tables that linked journal entries to other entities
DROP TABLE IF EXISTS "journal_photos";
DROP TABLE IF EXISTS "journal_locations";
DROP TABLE IF EXISTS "journal_activities";
DROP TABLE IF EXISTS "journal_lodgings";
DROP TABLE IF EXISTS "journal_transportations";
