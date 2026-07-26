-- =============================================================================
-- BASELINE MIGRATION — CREATES THE ENTIRE SCHEMA FROM EMPTY
-- =============================================================================
--
--  ****  DO NOT LET THIS RUN AGAINST AN EXISTING DATABASE.  ****
--
--  Every database that already has data (production, the developer database,
--  any restored dump) MUST have this migration marked as already applied, ONCE,
--  BEFORE any future `prisma migrate deploy`:
--
--      npx prisma migrate resolve --applied 00000000000000_init
--
--  See prisma/migrations/README.md for the full procedure.
--
--  As a last line of defence this migration refuses to run if the core tables
--  already exist. The guard below aborts the whole migration (Prisma runs each
--  migration file in a transaction, so nothing is left half-applied).
-- =============================================================================

DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'users'
  ) THEN
    RAISE EXCEPTION
      'REFUSING TO RUN BASELINE 00000000000000_init: table "users" already exists. This database is NOT fresh. Run: npx prisma migrate resolve --applied 00000000000000_init  (see prisma/migrations/README.md)';
  END IF;
END
$guard$;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('PHOTO', 'LOCATION', 'ACTIVITY', 'LODGING', 'TRANSPORTATION', 'JOURNAL_ENTRY', 'PHOTO_ALBUM', 'PDF_IMPORT', 'SAVED_LINK');

-- CreateEnum
CREATE TYPE "PdfImportStatus" AS ENUM ('UPLOADED', 'PARSING', 'PARSED', 'PARSE_FAILED', 'NO_ENTITIES');

-- CreateEnum
CREATE TYPE "PendingEntityType" AS ENUM ('TRANSPORTATION', 'LODGING', 'ACTIVITY', 'LOCATION');

-- CreateEnum
CREATE TYPE "PendingEntityStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LinkRelationship" AS ENUM ('RELATED', 'TAKEN_AT', 'OCCURRED_AT', 'PART_OF', 'DOCUMENTS', 'FEATURED_IN');

-- CreateEnum
CREATE TYPE "ValidationIssueCategory" AS ENUM ('SCHEDULE', 'ACCOMMODATIONS', 'TRANSPORTATION', 'COMPLETENESS', 'DOCUMENTS');

-- CreateEnum
CREATE TYPE "TravelDocumentType" AS ENUM ('PASSPORT', 'VISA', 'ID_CARD', 'GLOBAL_ENTRY', 'VACCINATION');

-- CreateEnum
CREATE TYPE "UserInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SavedLinkSource" AS ENUM ('MANUAL', 'EMAIL');

-- CreateEnum
CREATE TYPE "LinkMetadataStatus" AS ENUM ('PENDING', 'FETCHED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "EmailIngestStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'NO_LINKS', 'REJECTED_SENDER', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "avatar_url" VARCHAR(500),
    "timezone" VARCHAR(100) DEFAULT 'UTC',
    "activity_categories" JSONB NOT NULL DEFAULT '[{"name":"Sightseeing","emoji":"🏛️"},{"name":"Dining","emoji":"🍽️"},{"name":"Adventure","emoji":"🧗"},{"name":"Entertainment","emoji":"🎭"},{"name":"Shopping","emoji":"🛍️"},{"name":"Recreation","emoji":"⚽"},{"name":"Cultural","emoji":"🏛️"},{"name":"Sports","emoji":"🏅"},{"name":"Wellness","emoji":"🧘"},{"name":"Tour","emoji":"👥"},{"name":"Other","emoji":"📌"}]',
    "trip_types" JSONB NOT NULL DEFAULT '[{"name":"Leisure","emoji":"🏖️"},{"name":"Business","emoji":"💼"},{"name":"Road Trip","emoji":"🚗"},{"name":"Backpacking","emoji":"🎒"},{"name":"Cruise","emoji":"🚢"},{"name":"Study Abroad","emoji":"📚"},{"name":"Volunteer","emoji":"🤝"},{"name":"Pilgrimage","emoji":"🕊️"},{"name":"Adventure","emoji":"🧗"},{"name":"Family","emoji":"👨‍👩‍👧‍👦"},{"name":"Honeymoon","emoji":"💕"},{"name":"Other","emoji":"📌"}]',
    "dietary_preferences" JSONB NOT NULL DEFAULT '[]',
    "immich_api_url" VARCHAR(500),
    "immich_api_key" VARCHAR(500),
    "weather_api_key" VARCHAR(500),
    "aviationstack_api_key" VARCHAR(500),
    "openrouteservice_api_key" VARCHAR(500),
    "llm_api_key" VARCHAR(500),
    "llm_base_url" VARCHAR(500),
    "llm_model" VARCHAR(200),
    "smtp_provider" VARCHAR(50),
    "smtp_host" VARCHAR(500),
    "smtp_port" INTEGER,
    "smtp_secure" BOOLEAN,
    "smtp_user" VARCHAR(500),
    "smtp_password" VARCHAR(500),
    "smtp_from" VARCHAR(500),
    "password_version" INTEGER NOT NULL DEFAULT 0,
    "oidc_subject" VARCHAR(500),
    "calendar_token" VARCHAR(64),
    "link_ingest_senders" JSONB NOT NULL DEFAULT '[]',
    "use_custom_map_style" BOOLEAN NOT NULL DEFAULT true,
    "base_currency" VARCHAR(3),
    "preferred_maps_app" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "travel_partner_id" INTEGER,
    "default_partner_permission" VARCHAR(50) NOT NULL DEFAULT 'edit',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "timezone" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL DEFAULT 'planning',
    "trip_type" VARCHAR(100),
    "trip_type_emoji" VARCHAR(50),
    "privacy_level" VARCHAR(50) NOT NULL DEFAULT 'private',
    "share_token" VARCHAR(64),
    "share_enabled" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "cover_photo_id" INTEGER,
    "cover_image_path" VARCHAR(500),
    "cover_image_thumbnail_path" VARCHAR(500),
    "banner_photo_id" INTEGER,
    "add_to_places_visited" BOOLEAN NOT NULL DEFAULT false,
    "exclude_from_auto_share" BOOLEAN NOT NULL DEFAULT false,
    "series_id" INTEGER,
    "series_order" INTEGER,
    "budget" DECIMAL(12,2),
    "budget_currency" VARCHAR(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_series" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_tags" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "color" VARCHAR(7),
    "text_color" VARCHAR(7),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_tag_assignments" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_tag_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_companions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "notes" TEXT,
    "relationship" VARCHAR(255),
    "is_myself" BOOLEAN NOT NULL DEFAULT false,
    "avatar_url" VARCHAR(500),
    "dietary_preferences" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_companions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_companions" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "companion_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_companions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_collaborators" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "permission_level" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_invitations" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "invited_by_user_id" INTEGER NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "permission_level" VARCHAR(50) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "name" VARCHAR(500) NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "category_id" INTEGER,
    "visit_datetime" TIMESTAMP(3),
    "visit_duration_minutes" INTEGER,
    "notes" TEXT,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "opening_hours" TEXT,
    "opening_hours_source" VARCHAR(20),
    "timezone" VARCHAR(100),
    "coordinates" geography(Point, 4326),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_categories" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "icon" VARCHAR(100),
    "color" VARCHAR(7),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "source" VARCHAR(50) NOT NULL DEFAULT 'local',
    "media_type" VARCHAR(20) NOT NULL DEFAULT 'image',
    "immich_asset_id" VARCHAR(255),
    "local_path" VARCHAR(500),
    "thumbnail_path" VARCHAR(500),
    "duration" INTEGER,
    "caption" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "taken_at" TIMESTAMP(3),
    "coordinates" geography(Point, 4326),
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_albums" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "cover_photo_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_album_assignments" (
    "id" SERIAL NOT NULL,
    "album_id" INTEGER NOT NULL,
    "photo_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_album_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100),
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "timezone" VARCHAR(100),
    "cost" DECIMAL(10,2),
    "currency" VARCHAR(3),
    "exchange_rate" DECIMAL(20,10),
    "base_amount" DECIMAL(12,2),
    "base_currency" VARCHAR(3),
    "booking_url" VARCHAR(500),
    "booking_reference" VARCHAR(255),
    "notes" TEXT,
    "manual_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "dietary_tags" JSONB,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transportation" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "start_location_id" INTEGER,
    "start_location_text" VARCHAR(500),
    "end_location_id" INTEGER,
    "end_location_text" VARCHAR(500),
    "scheduled_start" TIMESTAMP(3),
    "scheduled_end" TIMESTAMP(3),
    "start_timezone" VARCHAR(100),
    "end_timezone" VARCHAR(100),
    "actual_start" TIMESTAMP(3),
    "actual_end" TIMESTAMP(3),
    "company" VARCHAR(255),
    "reference_number" VARCHAR(255),
    "seat_number" VARCHAR(50),
    "booking_reference" VARCHAR(255),
    "booking_url" VARCHAR(500),
    "cost" DECIMAL(10,2),
    "currency" VARCHAR(3),
    "exchange_rate" DECIMAL(20,10),
    "base_amount" DECIMAL(12,2),
    "base_currency" VARCHAR(3),
    "status" VARCHAR(50) NOT NULL DEFAULT 'on_time',
    "delay_minutes" INTEGER,
    "notes" TEXT,
    "connection_group_id" VARCHAR(100),
    "is_auto_generated" BOOLEAN NOT NULL DEFAULT false,
    "calculated_distance" DECIMAL(10,2),
    "calculated_duration" DECIMAL(10,2),
    "distance_source" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transportation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lodging" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "address" VARCHAR(1000),
    "check_in_date" TIMESTAMP(3) NOT NULL,
    "check_out_date" TIMESTAMP(3) NOT NULL,
    "timezone" VARCHAR(100),
    "confirmation_number" VARCHAR(255),
    "booking_url" VARCHAR(500),
    "cost" DECIMAL(10,2),
    "currency" VARCHAR(3),
    "exchange_rate" DECIMAL(20,10),
    "base_amount" DECIMAL(12,2),
    "base_currency" VARCHAR(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lodging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_expenses" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3),
    "exchange_rate" DECIMAL(20,10),
    "base_amount" DECIMAL(12,2),
    "base_currency" VARCHAR(3),
    "date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "from_currency" VARCHAR(3) NOT NULL,
    "to_currency" VARCHAR(3) NOT NULL,
    "rate" DECIMAL(20,10) NOT NULL,
    "source" VARCHAR(50) NOT NULL DEFAULT 'frankfurter',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "date" DATE,
    "title" VARCHAR(500),
    "content" TEXT NOT NULL,
    "entry_type" VARCHAR(50) NOT NULL,
    "mood" VARCHAR(50),
    "weather_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_data" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "location_id" INTEGER,
    "date" DATE NOT NULL,
    "temperature_high" DECIMAL(5,2),
    "temperature_low" DECIMAL(5,2),
    "conditions" VARCHAR(255),
    "precipitation" DECIMAL(5,2),
    "humidity" INTEGER,
    "wind_speed" DECIMAL(5,2),
    "sunrise" TIMESTAMP(3),
    "sunset" TIMESTAMP(3),
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_tracking" (
    "id" SERIAL NOT NULL,
    "transportation_id" INTEGER NOT NULL,
    "flight_number" VARCHAR(50),
    "airline_code" VARCHAR(10),
    "status" VARCHAR(50),
    "gate" VARCHAR(20),
    "terminal" VARCHAR(20),
    "baggage_claim" VARCHAR(20),
    "departure_delay" INTEGER,
    "arrival_delay" INTEGER,
    "scheduled_departure" TIMESTAMP(3),
    "actual_departure" TIMESTAMP(3),
    "scheduled_arrival" TIMESTAMP(3),
    "actual_arrival" TIMESTAMP(3),
    "last_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flight_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklists" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "trip_id" INTEGER,
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(50) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" SERIAL NOT NULL,
    "checklist_id" INTEGER NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "is_checked" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_cache" (
    "id" SERIAL NOT NULL,
    "from_lat" DECIMAL(10,8) NOT NULL,
    "from_lon" DECIMAL(11,8) NOT NULL,
    "to_lat" DECIMAL(10,8) NOT NULL,
    "to_lon" DECIMAL(11,8) NOT NULL,
    "distance" DECIMAL(10,2) NOT NULL,
    "duration" DECIMAL(10,2) NOT NULL,
    "profile" VARCHAR(50) NOT NULL,
    "route_geometry" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_links" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "source_type" "EntityType" NOT NULL,
    "source_id" INTEGER NOT NULL,
    "target_type" "EntityType" NOT NULL,
    "target_id" INTEGER NOT NULL,
    "relationship" "LinkRelationship" NOT NULL DEFAULT 'RELATED',
    "sort_order" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dismissed_validation_issues" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "issue_type" VARCHAR(100) NOT NULL,
    "issue_key" VARCHAR(500) NOT NULL,
    "category" "ValidationIssueCategory" NOT NULL,
    "dismissed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dismissed_validation_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_documents" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "TravelDocumentType" NOT NULL,
    "issuing_country" VARCHAR(100) NOT NULL,
    "document_number" VARCHAR(255),
    "issue_date" DATE,
    "expiry_date" DATE,
    "name" VARCHAR(500) NOT NULL,
    "notes" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "alert_days_before" INTEGER NOT NULL DEFAULT 180,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visa_requirements" (
    "id" SERIAL NOT NULL,
    "passport_country" VARCHAR(100) NOT NULL,
    "destination_country" VARCHAR(100) NOT NULL,
    "visa_required" BOOLEAN NOT NULL,
    "visa_type" VARCHAR(50) NOT NULL,
    "max_stay_days" INTEGER,
    "notes" TEXT,
    "source_url" VARCHAR(500),
    "last_verified" DATE,

    CONSTRAINT "visa_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_languages" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "language_code" VARCHAR(10) NOT NULL,
    "language" VARCHAR(100) NOT NULL,

    CONSTRAINT "trip_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "language_phrases" (
    "id" SERIAL NOT NULL,
    "language" VARCHAR(100) NOT NULL,
    "language_code" VARCHAR(10) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "english" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "pronunciation" TEXT,
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "language_phrases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_imports" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "original_name" VARCHAR(500) NOT NULL,
    "stored_path" VARCHAR(500) NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "status" "PdfImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "error_message" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_entities" (
    "id" SERIAL NOT NULL,
    "pdf_import_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "entity_type" "PendingEntityType" NOT NULL,
    "parsed_data" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "matched_trip_id" INTEGER,
    "status" "PendingEntityStatus" NOT NULL DEFAULT 'PENDING',
    "created_entity_id" INTEGER,
    "created_entity_type" "PendingEntityType",
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_invitations" (
    "id" SERIAL NOT NULL,
    "invited_by_user_id" INTEGER,
    "email" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "status" "UserInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "accepted_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_links" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "trip_id" INTEGER,
    "url" TEXT NOT NULL,
    "title" VARCHAR(1000),
    "description" TEXT,
    "site_name" VARCHAR(255),
    "image_url" TEXT,
    "notes" TEXT,
    "source" "SavedLinkSource" NOT NULL DEFAULT 'MANUAL',
    "metadata_status" "LinkMetadataStatus" NOT NULL DEFAULT 'PENDING',
    "metadata_fetched_at" TIMESTAMP(3),
    "email_ingest_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_ingests" (
    "id" SERIAL NOT NULL,
    "message_id" VARCHAR(1000) NOT NULL,
    "user_id" INTEGER,
    "from_address" VARCHAR(500),
    "to_address" VARCHAR(500),
    "subject" VARCHAR(1000),
    "received_at" TIMESTAMP(3),
    "status" "EmailIngestStatus" NOT NULL DEFAULT 'PROCESSING',
    "link_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_ingests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_oidc_subject_key" ON "users"("oidc_subject");

-- CreateIndex
CREATE UNIQUE INDEX "users_calendar_token_key" ON "users"("calendar_token");

-- CreateIndex
CREATE INDEX "users_travel_partner_id_idx" ON "users"("travel_partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "trips_share_token_key" ON "trips"("share_token");

-- CreateIndex
CREATE INDEX "trips_user_id_status_idx" ON "trips"("user_id", "status");

-- CreateIndex
CREATE INDEX "trips_start_date_end_date_idx" ON "trips"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "trips_series_id_series_order_idx" ON "trips"("series_id", "series_order");

-- CreateIndex
CREATE INDEX "trip_series_user_id_idx" ON "trip_series"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_tags_user_id_name_key" ON "trip_tags"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "trip_tag_assignments_trip_id_tag_id_key" ON "trip_tag_assignments"("trip_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_companions_trip_id_companion_id_key" ON "trip_companions"("trip_id", "companion_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_collaborators_trip_id_user_id_key" ON "trip_collaborators"("trip_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_invitations_token_key" ON "trip_invitations"("token");

-- CreateIndex
CREATE INDEX "trip_invitations_email_idx" ON "trip_invitations"("email");

-- CreateIndex
CREATE INDEX "trip_invitations_token_idx" ON "trip_invitations"("token");

-- CreateIndex
CREATE INDEX "trip_invitations_trip_id_status_idx" ON "trip_invitations"("trip_id", "status");

-- CreateIndex
CREATE INDEX "locations_trip_id_idx" ON "locations"("trip_id");

-- CreateIndex
CREATE INDEX "locations_parent_id_idx" ON "locations"("parent_id");

-- CreateIndex
CREATE INDEX "locations_coordinates_idx" ON "locations" USING GIST ("coordinates");

-- CreateIndex
CREATE INDEX "location_categories_user_id_idx" ON "location_categories"("user_id");

-- CreateIndex
CREATE INDEX "photos_trip_id_taken_at_idx" ON "photos"("trip_id", "taken_at");

-- CreateIndex
CREATE INDEX "photos_trip_id_idx" ON "photos"("trip_id");

-- CreateIndex
CREATE INDEX "photos_taken_at_idx" ON "photos"("taken_at");

-- CreateIndex
CREATE INDEX "photos_coordinates_idx" ON "photos" USING GIST ("coordinates");

-- CreateIndex
CREATE UNIQUE INDEX "photos_trip_id_immich_asset_id_key" ON "photos"("trip_id", "immich_asset_id");

-- CreateIndex
CREATE INDEX "photo_albums_trip_id_idx" ON "photo_albums"("trip_id");

-- CreateIndex
CREATE INDEX "photo_album_assignments_album_id_idx" ON "photo_album_assignments"("album_id");

-- CreateIndex
CREATE INDEX "photo_album_assignments_photo_id_idx" ON "photo_album_assignments"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "photo_album_assignments_album_id_photo_id_key" ON "photo_album_assignments"("album_id", "photo_id");

-- CreateIndex
CREATE INDEX "activities_trip_id_idx" ON "activities"("trip_id");

-- CreateIndex
CREATE INDEX "activities_parent_id_idx" ON "activities"("parent_id");

-- CreateIndex
CREATE INDEX "activities_trip_id_manual_order_idx" ON "activities"("trip_id", "manual_order");

-- CreateIndex
CREATE INDEX "activities_start_time_idx" ON "activities"("start_time");

-- CreateIndex
CREATE INDEX "transportation_trip_id_idx" ON "transportation"("trip_id");

-- CreateIndex
CREATE INDEX "transportation_scheduled_start_idx" ON "transportation"("scheduled_start");

-- CreateIndex
CREATE INDEX "transportation_connection_group_id_idx" ON "transportation"("connection_group_id");

-- CreateIndex
CREATE INDEX "lodging_trip_id_idx" ON "lodging"("trip_id");

-- CreateIndex
CREATE INDEX "lodging_check_in_date_idx" ON "lodging"("check_in_date");

-- CreateIndex
CREATE INDEX "lodging_check_out_date_idx" ON "lodging"("check_out_date");

-- CreateIndex
CREATE INDEX "trip_expenses_trip_id_idx" ON "trip_expenses"("trip_id");

-- CreateIndex
CREATE INDEX "trip_expenses_trip_id_date_idx" ON "trip_expenses"("trip_id", "date");

-- CreateIndex
CREATE INDEX "exchange_rates_from_currency_to_currency_idx" ON "exchange_rates"("from_currency", "to_currency");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_date_from_currency_to_currency_key" ON "exchange_rates"("date", "from_currency", "to_currency");

-- CreateIndex
CREATE INDEX "journal_entries_trip_id_date_idx" ON "journal_entries"("trip_id", "date");

-- CreateIndex
CREATE INDEX "weather_data_trip_id_idx" ON "weather_data"("trip_id");

-- CreateIndex
CREATE INDEX "weather_data_location_id_idx" ON "weather_data"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "weather_data_trip_id_date_key" ON "weather_data"("trip_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "flight_tracking_transportation_id_key" ON "flight_tracking"("transportation_id");

-- CreateIndex
CREATE INDEX "checklists_user_id_idx" ON "checklists"("user_id");

-- CreateIndex
CREATE INDEX "checklists_trip_id_idx" ON "checklists"("trip_id");

-- CreateIndex
CREATE INDEX "checklist_items_checklist_id_idx" ON "checklist_items"("checklist_id");

-- CreateIndex
CREATE UNIQUE INDEX "route_cache_from_lat_from_lon_to_lat_to_lon_profile_key" ON "route_cache"("from_lat", "from_lon", "to_lat", "to_lon", "profile");

-- CreateIndex
CREATE INDEX "entity_links_trip_id_source_type_source_id_idx" ON "entity_links"("trip_id", "source_type", "source_id");

-- CreateIndex
CREATE INDEX "entity_links_trip_id_target_type_target_id_idx" ON "entity_links"("trip_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "entity_links_source_type_source_id_idx" ON "entity_links"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "entity_links_target_type_target_id_idx" ON "entity_links"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "entity_links_trip_id_idx" ON "entity_links"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "entity_links_trip_id_source_type_source_id_target_type_targ_key" ON "entity_links"("trip_id", "source_type", "source_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "dismissed_validation_issues_trip_id_idx" ON "dismissed_validation_issues"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "dismissed_validation_issues_trip_id_issue_type_issue_key_key" ON "dismissed_validation_issues"("trip_id", "issue_type", "issue_key");

-- CreateIndex
CREATE INDEX "travel_documents_user_id_idx" ON "travel_documents"("user_id");

-- CreateIndex
CREATE INDEX "travel_documents_expiry_date_idx" ON "travel_documents"("expiry_date");

-- CreateIndex
CREATE INDEX "visa_requirements_passport_country_idx" ON "visa_requirements"("passport_country");

-- CreateIndex
CREATE INDEX "visa_requirements_destination_country_idx" ON "visa_requirements"("destination_country");

-- CreateIndex
CREATE UNIQUE INDEX "visa_requirements_passport_country_destination_country_key" ON "visa_requirements"("passport_country", "destination_country");

-- CreateIndex
CREATE INDEX "trip_languages_trip_id_idx" ON "trip_languages"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_languages_trip_id_language_code_key" ON "trip_languages"("trip_id", "language_code");

-- CreateIndex
CREATE INDEX "language_phrases_language_code_idx" ON "language_phrases"("language_code");

-- CreateIndex
CREATE INDEX "language_phrases_category_idx" ON "language_phrases"("category");

-- CreateIndex
CREATE INDEX "language_phrases_language_code_category_idx" ON "language_phrases"("language_code", "category");

-- CreateIndex
CREATE INDEX "pdf_imports_user_id_idx" ON "pdf_imports"("user_id");

-- CreateIndex
CREATE INDEX "pdf_imports_user_id_status_idx" ON "pdf_imports"("user_id", "status");

-- CreateIndex
CREATE INDEX "pending_entities_user_id_status_idx" ON "pending_entities"("user_id", "status");

-- CreateIndex
CREATE INDEX "pending_entities_pdf_import_id_idx" ON "pending_entities"("pdf_import_id");

-- CreateIndex
CREATE INDEX "pending_entities_matched_trip_id_idx" ON "pending_entities"("matched_trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_token_key" ON "user_invitations"("token");

-- CreateIndex
CREATE INDEX "user_invitations_email_idx" ON "user_invitations"("email");

-- CreateIndex
CREATE INDEX "user_invitations_token_idx" ON "user_invitations"("token");

-- CreateIndex
CREATE INDEX "user_invitations_status_idx" ON "user_invitations"("status");

-- CreateIndex
CREATE INDEX "user_invitations_invited_by_user_id_idx" ON "user_invitations"("invited_by_user_id");

-- CreateIndex
CREATE INDEX "user_invitations_email_status_idx" ON "user_invitations"("email", "status");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "saved_links_user_id_idx" ON "saved_links"("user_id");

-- CreateIndex
CREATE INDEX "saved_links_user_id_trip_id_idx" ON "saved_links"("user_id", "trip_id");

-- CreateIndex
CREATE INDEX "saved_links_trip_id_idx" ON "saved_links"("trip_id");

-- CreateIndex
CREATE INDEX "saved_links_email_ingest_id_idx" ON "saved_links"("email_ingest_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_ingests_message_id_key" ON "email_ingests"("message_id");

-- CreateIndex
CREATE INDEX "email_ingests_user_id_idx" ON "email_ingests"("user_id");

-- CreateIndex
CREATE INDEX "email_ingests_user_id_status_idx" ON "email_ingests"("user_id", "status");

-- CreateIndex
CREATE INDEX "email_ingests_status_idx" ON "email_ingests"("status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_travel_partner_id_fkey" FOREIGN KEY ("travel_partner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "trip_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_cover_photo_id_fkey" FOREIGN KEY ("cover_photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_banner_photo_id_fkey" FOREIGN KEY ("banner_photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_series" ADD CONSTRAINT "trip_series_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_tags" ADD CONSTRAINT "trip_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_tag_assignments" ADD CONSTRAINT "trip_tag_assignments_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_tag_assignments" ADD CONSTRAINT "trip_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "trip_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_companions" ADD CONSTRAINT "travel_companions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_companions" ADD CONSTRAINT "trip_companions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_companions" ADD CONSTRAINT "trip_companions_companion_id_fkey" FOREIGN KEY ("companion_id") REFERENCES "travel_companions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_collaborators" ADD CONSTRAINT "trip_collaborators_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_collaborators" ADD CONSTRAINT "trip_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_invitations" ADD CONSTRAINT "trip_invitations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_invitations" ADD CONSTRAINT "trip_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "location_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_categories" ADD CONSTRAINT "location_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_albums" ADD CONSTRAINT "photo_albums_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_albums" ADD CONSTRAINT "photo_albums_cover_photo_id_fkey" FOREIGN KEY ("cover_photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_album_assignments" ADD CONSTRAINT "photo_album_assignments_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "photo_albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_album_assignments" ADD CONSTRAINT "photo_album_assignments_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transportation" ADD CONSTRAINT "transportation_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transportation" ADD CONSTRAINT "transportation_start_location_id_fkey" FOREIGN KEY ("start_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transportation" ADD CONSTRAINT "transportation_end_location_id_fkey" FOREIGN KEY ("end_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lodging" ADD CONSTRAINT "lodging_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_data" ADD CONSTRAINT "weather_data_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_data" ADD CONSTRAINT "weather_data_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_tracking" ADD CONSTRAINT "flight_tracking_transportation_id_fkey" FOREIGN KEY ("transportation_id") REFERENCES "transportation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_links" ADD CONSTRAINT "entity_links_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dismissed_validation_issues" ADD CONSTRAINT "dismissed_validation_issues_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_documents" ADD CONSTRAINT "travel_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_languages" ADD CONSTRAINT "trip_languages_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_imports" ADD CONSTRAINT "pdf_imports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_entities" ADD CONSTRAINT "pending_entities_pdf_import_id_fkey" FOREIGN KEY ("pdf_import_id") REFERENCES "pdf_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_entities" ADD CONSTRAINT "pending_entities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_entities" ADD CONSTRAINT "pending_entities_matched_trip_id_fkey" FOREIGN KEY ("matched_trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_accepted_user_id_fkey" FOREIGN KEY ("accepted_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_links" ADD CONSTRAINT "saved_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_links" ADD CONSTRAINT "saved_links_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_links" ADD CONSTRAINT "saved_links_email_ingest_id_fkey" FOREIGN KEY ("email_ingest_id") REFERENCES "email_ingests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_ingests" ADD CONSTRAINT "email_ingests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- =============================================================================
-- CHECK constraints
-- -----------------------------------------------------------------------------
-- Prisma cannot express CHECK constraints, so `migrate diff` never emits them.
-- They are part of the real schema (added by 20260220000000 and 20260728020000)
-- and are re-created here so a database provisioned from this baseline matches
-- an existing deployment. Guarded so re-running is harmless.
-- =============================================================================

DO $checks$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_cost_non_negative') THEN
    ALTER TABLE "activities" ADD CONSTRAINT "activity_cost_non_negative" CHECK ("cost" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lodging_cost_non_negative') THEN
    ALTER TABLE "lodging" ADD CONSTRAINT "lodging_cost_non_negative" CHECK ("cost" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transportation_cost_non_negative') THEN
    ALTER TABLE "transportation" ADD CONSTRAINT "transportation_cost_non_negative" CHECK ("cost" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trip_expenses_amount_non_negative') THEN
    ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_amount_non_negative" CHECK ("amount" >= 0);
  END IF;
END
$checks$;
