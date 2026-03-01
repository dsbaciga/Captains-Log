-- CreateEnum
CREATE TYPE "EmailImportStatus" AS ENUM ('FETCHED', 'PARSING', 'PARSED', 'PARSE_FAILED', 'NO_ENTITIES', 'NO_USER');

-- CreateEnum
CREATE TYPE "PendingEntityType" AS ENUM ('TRANSPORTATION', 'LODGING', 'ACTIVITY', 'LOCATION');

-- CreateEnum
CREATE TYPE "PendingEntityStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "forwarding_email" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "users_forwarding_email_key" ON "users"("forwarding_email");

-- CreateTable
CREATE TABLE "email_imports" (
    "id" SERIAL NOT NULL,
    "gmail_message_id" VARCHAR(255) NOT NULL,
    "thread_id" VARCHAR(255),
    "subject" VARCHAR(1000),
    "from_address" VARCHAR(500),
    "forwarded_by" VARCHAR(500),
    "user_id" INTEGER,
    "raw_content" TEXT,
    "status" "EmailImportStatus" NOT NULL DEFAULT 'FETCHED',
    "error_message" TEXT,
    "processed_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_entities" (
    "id" SERIAL NOT NULL,
    "email_import_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "entity_type" "PendingEntityType" NOT NULL,
    "parsed_data" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "matched_trip_id" INTEGER,
    "status" "PendingEntityStatus" NOT NULL DEFAULT 'PENDING',
    "created_entity_id" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_entities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_imports_gmail_message_id_key" ON "email_imports"("gmail_message_id");

-- CreateIndex
CREATE INDEX "email_imports_user_id_idx" ON "email_imports"("user_id");

-- CreateIndex
CREATE INDEX "email_imports_status_idx" ON "email_imports"("status");

-- CreateIndex
CREATE INDEX "pending_entities_user_id_status_idx" ON "pending_entities"("user_id", "status");

-- CreateIndex
CREATE INDEX "pending_entities_email_import_id_idx" ON "pending_entities"("email_import_id");

-- CreateIndex
CREATE INDEX "pending_entities_matched_trip_id_idx" ON "pending_entities"("matched_trip_id");

-- AddForeignKey
ALTER TABLE "email_imports" ADD CONSTRAINT "email_imports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_entities" ADD CONSTRAINT "pending_entities_email_import_id_fkey" FOREIGN KEY ("email_import_id") REFERENCES "email_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_entities" ADD CONSTRAINT "pending_entities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_entities" ADD CONSTRAINT "pending_entities_matched_trip_id_fkey" FOREIGN KEY ("matched_trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
