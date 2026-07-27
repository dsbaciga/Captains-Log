-- Emergency Card (feature #111).
--
-- Purely additive: one new table, two nullable/defaulted columns on
-- `travel_companions`, and one nullable column on `trips`. No existing column,
-- constraint or row is modified, so this is safe to apply to a populated
-- production database.
--
-- `trip_emergency_info` holds only what the traveller types in: insurer, policy
-- number, assistance line, and the embassy they would actually call. Local
-- emergency numbers are NOT stored here — they come from a static dataset
-- bundled with the client so the card works with the phone in airplane mode.

-- CreateTable
CREATE TABLE "trip_emergency_info" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "insurance_provider" VARCHAR(255),
    "insurance_policy_number" VARCHAR(100),
    "insurance_assistance_phone" VARCHAR(50),
    "embassy_name" VARCHAR(255),
    "embassy_phone" VARCHAR(50),
    "embassy_address" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_emergency_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- One emergency record per trip: the API upserts on trip_id rather than
-- creating a second row when the form is saved twice.
CREATE UNIQUE INDEX "trip_emergency_info_trip_id_key" ON "trip_emergency_info"("trip_id");

-- AddForeignKey
ALTER TABLE "trip_emergency_info" ADD CONSTRAINT "trip_emergency_info_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
-- Companion medical details, alongside the existing dietary_preferences column.
-- `allergies` uses the same JSONB-array shape as dietary_preferences so both are
-- edited and rendered by the same code; they are separate columns because only
-- the medical one belongs on an emergency card.
ALTER TABLE "travel_companions" ADD COLUMN     "medical_notes" TEXT,
ADD COLUMN     "allergies" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
-- The trip's destination country, as ISO 3166-1 alpha-2. Null means "infer it
-- from the trip's locations". This lives on `trips`, not on `trip_emergency_info`,
-- because the country is a fact about the trip rather than about its emergency
-- record: the emergency card and the local-norms card both read it, so a
-- correction made on either one holds for both.
ALTER TABLE "trips" ADD COLUMN     "country_code" VARCHAR(2);
