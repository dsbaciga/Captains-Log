-- AlterTable lodging: Rename columns and add missing fields
ALTER TABLE "lodging" RENAME COLUMN "check_in" TO "check_in_date";
ALTER TABLE "lodging" RENAME COLUMN "check_out" TO "check_out_date";
ALTER TABLE "lodging" RENAME COLUMN "booking_reference" TO "confirmation_number";
ALTER TABLE "lodging" DROP COLUMN IF EXISTS "rating";
ALTER TABLE "lodging" ADD COLUMN IF NOT EXISTS "type" VARCHAR(50) NOT NULL DEFAULT 'hotel';
ALTER TABLE "lodging" ADD COLUMN IF NOT EXISTS "address" VARCHAR(1000);

-- Remove default after adding column
ALTER TABLE "lodging" ALTER COLUMN "type" DROP DEFAULT;
