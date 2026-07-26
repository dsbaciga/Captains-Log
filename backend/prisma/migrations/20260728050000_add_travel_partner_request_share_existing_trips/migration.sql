-- Opt-in back-sharing of EXISTING trips when a travel partner request is accepted.
--
-- Purely additive: one new column on the table created by 20260728040000, with a
-- NOT NULL DEFAULT so existing rows are backfilled to `false` (no retroactive
-- sharing) without a rewrite of any other table. Nothing is dropped or altered.
--
-- This records the REQUESTER's choice about their OWN trips, made at send time but
-- only acted on if and when the recipient accepts. The recipient's equivalent
-- choice is supplied on the accept call and acted on immediately, so it needs no
-- column. Neither side's flag can share the other side's history — that is what
-- keeps this consistent with the consent model the table exists to enforce.

-- AlterTable
ALTER TABLE "travel_partner_requests" ADD COLUMN     "share_existing_trips" BOOLEAN NOT NULL DEFAULT false;
