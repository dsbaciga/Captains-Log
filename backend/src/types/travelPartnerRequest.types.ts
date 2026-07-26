import { z } from 'zod';

/**
 * Travel partner request status values.
 *
 * Mirrors the `TravelPartnerRequestStatus` enum in schema.prisma. Declared as a
 * const object (rather than importing the generated Prisma enum) so tests and the
 * service can reference it without pulling in the Prisma client, matching
 * userInvitation.types.ts.
 */
export const TravelPartnerRequestStatusValues = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
} as const;

export type TravelPartnerRequestStatusType =
  (typeof TravelPartnerRequestStatusValues)[keyof typeof TravelPartnerRequestStatusValues];

/**
 * Schema for sending a travel partner request.
 *
 * Addressed by user id rather than email: the recipient is always an existing
 * account (found through GET /api/users/search) and responds from inside the app,
 * so there is no emailed accept-link and therefore no token.
 */
export const sendTravelPartnerRequestSchema = z.object({
  recipientId: z.number().int().positive(),
  message: z.string().max(1000).optional(),
  /**
   * Opt in to sharing the REQUESTER's OWN existing trips with the recipient if the
   * request is accepted. Omitted means false: retroactive sharing is never implied.
   */
  shareExistingTrips: z.boolean().optional(),
});

export type SendTravelPartnerRequestInput = z.infer<typeof sendTravelPartnerRequestSchema>;

/**
 * Body for the accept endpoint.
 *
 * The mirror image of the send flag: opt in to sharing the RECIPIENT's OWN existing
 * trips with the requester. Each side only ever gives away its own history, so
 * neither flag lets a user reach backwards into the other's trips.
 */
export const acceptTravelPartnerRequestSchema = z.object({
  shareExistingTrips: z.boolean().optional(),
});

export type AcceptTravelPartnerRequestInput = z.infer<typeof acceptTravelPartnerRequestSchema>;

/** Public shape of the other party on a request. Never includes email. */
export interface TravelPartnerRequestUser {
  id: number;
  username: string;
  avatarUrl: string | null;
}

export interface TravelPartnerRequestResponse {
  id: number;
  status: TravelPartnerRequestStatusType;
  message: string | null;
  shareExistingTrips: boolean;
  createdAt: Date;
  respondedAt: Date | null;
  requester: TravelPartnerRequestUser;
  recipient: TravelPartnerRequestUser;
}

export interface TravelPartnerRequestListResponse {
  incoming: TravelPartnerRequestResponse[];
  outgoing: TravelPartnerRequestResponse[];
}
