-- Manual migration fix for v1.2.0 journal associations
-- Run this if the automatic migration failed on TrueNAS

-- Create journal_activities table
CREATE TABLE IF NOT EXISTS "journal_activities" (
    "id" SERIAL NOT NULL,
    "journal_id" INTEGER NOT NULL,
    "activity_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "journal_activities_pkey" PRIMARY KEY ("id")
);

-- Create journal_lodgings table
CREATE TABLE IF NOT EXISTS "journal_lodgings" (
    "id" SERIAL NOT NULL,
    "journal_id" INTEGER NOT NULL,
    "lodging_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "journal_lodgings_pkey" PRIMARY KEY ("id")
);

-- Create journal_transportations table
CREATE TABLE IF NOT EXISTS "journal_transportations" (
    "id" SERIAL NOT NULL,
    "journal_id" INTEGER NOT NULL,
    "transportation_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "journal_transportations_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'journal_activities_journal_id_activity_id_key'
    ) THEN
        ALTER TABLE "journal_activities"
        ADD CONSTRAINT "journal_activities_journal_id_activity_id_key"
        UNIQUE ("journal_id", "activity_id");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'journal_lodgings_journal_id_lodging_id_key'
    ) THEN
        ALTER TABLE "journal_lodgings"
        ADD CONSTRAINT "journal_lodgings_journal_id_lodging_id_key"
        UNIQUE ("journal_id", "lodging_id");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'journal_transportations_journal_id_transportation_id_key'
    ) THEN
        ALTER TABLE "journal_transportations"
        ADD CONSTRAINT "journal_transportations_journal_id_transportation_id_key"
        UNIQUE ("journal_id", "transportation_id");
    END IF;
END $$;

-- Add foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'journal_activities_journal_id_fkey'
    ) THEN
        ALTER TABLE "journal_activities"
        ADD CONSTRAINT "journal_activities_journal_id_fkey"
        FOREIGN KEY ("journal_id") REFERENCES "journal_entries"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'journal_activities_activity_id_fkey'
    ) THEN
        ALTER TABLE "journal_activities"
        ADD CONSTRAINT "journal_activities_activity_id_fkey"
        FOREIGN KEY ("activity_id") REFERENCES "activities"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'journal_lodgings_journal_id_fkey'
    ) THEN
        ALTER TABLE "journal_lodgings"
        ADD CONSTRAINT "journal_lodgings_journal_id_fkey"
        FOREIGN KEY ("journal_id") REFERENCES "journal_entries"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'journal_lodgings_lodging_id_fkey'
    ) THEN
        ALTER TABLE "journal_lodgings"
        ADD CONSTRAINT "journal_lodgings_lodging_id_fkey"
        FOREIGN KEY ("lodging_id") REFERENCES "lodging"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'journal_transportations_journal_id_fkey'
    ) THEN
        ALTER TABLE "journal_transportations"
        ADD CONSTRAINT "journal_transportations_journal_id_fkey"
        FOREIGN KEY ("journal_id") REFERENCES "journal_entries"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'journal_transportations_transportation_id_fkey'
    ) THEN
        ALTER TABLE "journal_transportations"
        ADD CONSTRAINT "journal_transportations_transportation_id_fkey"
        FOREIGN KEY ("transportation_id") REFERENCES "transportation"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
