import { z } from 'zod';
import { optionalNotesWithMax, optionalStringWithMax } from '../validation/zodHelpers';

/**
 * Emergency Card (feature #111).
 *
 * Only the traveller-entered half is validated here. Local emergency numbers are
 * not accepted from the client at all — they come from the static country dataset
 * bundled with the frontend, so there is nothing to store and nothing to trust.
 */

/**
 * The emergency record is a per-trip singleton written through a single PUT that
 * upserts, so there is no separate create schema: every field is optional (absent
 * leaves it unchanged) and nullable (null clears it), per the repo's update rule.
 *
 * The destination country is deliberately NOT here — it lives on `Trip.countryCode`
 * and is written through the trip endpoint. It is a fact about the trip, not about
 * its emergency record, and the local-norms card reads the same column, so keeping
 * a second copy here would let the two cards disagree about where you are.
 */
export const updateTripEmergencyInfoSchema = z.object({
  insuranceProvider: optionalStringWithMax(255),
  insurancePolicyNumber: optionalStringWithMax(100),
  insuranceAssistancePhone: optionalStringWithMax(50),
  embassyName: optionalStringWithMax(255),
  embassyPhone: optionalStringWithMax(50),
  embassyAddress: optionalNotesWithMax(1000),
  notes: optionalNotesWithMax(2000),
});

export type UpdateTripEmergencyInfoInput = z.infer<typeof updateTripEmergencyInfoSchema>;
