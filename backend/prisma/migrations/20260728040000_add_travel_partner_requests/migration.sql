-- Travel partner consent flow.
--
-- Purely additive: one new enum, one new table, its indexes and foreign keys.
-- No existing table, column, constraint or row is touched, so this is safe to
-- apply to a populated production database.
--
-- Why the table exists: a travel partnership causes every new trip either user
-- creates to be auto-shared with the other (backend/src/services/trip.service.ts).
-- Establishing it therefore requires the consent of both sides. `users.travel_partner_id`
-- is only ever written for the user making the change themselves; the reciprocal
-- write happens only when the recipient accepts a request recorded here.

-- CreateEnum
CREATE TYPE "TravelPartnerRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "travel_partner_requests" (
    "id" SERIAL NOT NULL,
    "requester_id" INTEGER NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "status" "TravelPartnerRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_partner_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "travel_partner_requests_recipient_id_status_idx" ON "travel_partner_requests"("recipient_id", "status");

-- CreateIndex
CREATE INDEX "travel_partner_requests_requester_id_status_idx" ON "travel_partner_requests"("requester_id", "status");

-- CreateIndex
-- One row per ordered (requester, recipient) pair: a re-send updates the existing
-- row rather than creating a second pending request between the same two users.
CREATE UNIQUE INDEX "travel_partner_requests_requester_id_recipient_id_key" ON "travel_partner_requests"("requester_id", "recipient_id");

-- AddForeignKey
ALTER TABLE "travel_partner_requests" ADD CONSTRAINT "travel_partner_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_partner_requests" ADD CONSTRAINT "travel_partner_requests_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Defence in depth for the self-request rule, which the service also enforces.
-- Prisma cannot express CHECK constraints in the schema, so this is hand-written
-- (same pattern as 20260220000000_add_cost_check_constraints_and_defaults).
ALTER TABLE "travel_partner_requests"
    ADD CONSTRAINT "travel_partner_requests_no_self_request_check"
    CHECK ("requester_id" <> "recipient_id");
