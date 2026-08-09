-- Custom items: a user-defined catch-all entity attachable to a trip.
-- See docs/development/CUSTOM_ITEM_SPEC.md

-- Widen the polymorphic link enum so custom items participate in EntityLink.
ALTER TYPE "EntityType" ADD VALUE IF NOT EXISTS 'CUSTOM_ITEM';

-- Presentation-only type registry (label + icon + color). Always user-owned:
-- unlike location_categories there is no NULL-userId system row.
CREATE TABLE "custom_item_types" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "icon" VARCHAR(100),
    "color" VARCHAR(7),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_item_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "custom_item_types_user_id_name_key" ON "custom_item_types"("user_id", "name");
CREATE INDEX "custom_item_types_user_id_idx" ON "custom_item_types"("user_id");

ALTER TABLE "custom_item_types"
    ADD CONSTRAINT "custom_item_types_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "custom_items" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "type_id" INTEGER,
    "name" VARCHAR(500) NOT NULL,
    "notes" TEXT,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "timezone" VARCHAR(100),
    "location_id" INTEGER,
    "cost" DECIMAL(10,2),
    "currency" VARCHAR(3),
    "exchange_rate" DECIMAL(20,10),
    "base_amount" DECIMAL(12,2),
    "base_currency" VARCHAR(3),
    "url" TEXT,
    "confirmation_number" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "custom_items_trip_id_idx" ON "custom_items"("trip_id");
CREATE INDEX "custom_items_trip_id_start_time_idx" ON "custom_items"("trip_id", "start_time");
CREATE INDEX "custom_items_type_id_idx" ON "custom_items"("type_id");
CREATE INDEX "custom_items_location_id_idx" ON "custom_items"("location_id");

ALTER TABLE "custom_items"
    ADD CONSTRAINT "custom_items_trip_id_fkey"
    FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SetNull: deleting a type leaves its items intact, presented as untyped.
ALTER TABLE "custom_items"
    ADD CONSTRAINT "custom_items_type_id_fkey"
    FOREIGN KEY ("type_id") REFERENCES "custom_item_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "custom_items"
    ADD CONSTRAINT "custom_items_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Matches the constraints on activities/lodging/transportation. Prisma cannot
-- express CHECK constraints, so `prisma db push` would not recreate this.
ALTER TABLE "custom_items"
    ADD CONSTRAINT "custom_item_cost_non_negative" CHECK ("cost" >= 0);
