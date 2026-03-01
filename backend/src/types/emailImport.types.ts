import { z } from 'zod';

export const acceptPendingEntitySchema = z.object({
  tripId: z.number().optional(),
  data: z.record(z.unknown()).optional(),
});

export const updatePendingEntitySchema = z.object({
  parsedData: z.record(z.unknown()).optional(),
  matchedTripId: z.number().nullable().optional(),
});

export const emailImportsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const pendingEntitiesQuerySchema = z.object({
  tripId: z.coerce.number().optional(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']).optional(),
  entityType: z.enum(['TRANSPORTATION', 'LODGING', 'ACTIVITY', 'LOCATION']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export type AcceptPendingEntityInput = z.infer<typeof acceptPendingEntitySchema>;
export type UpdatePendingEntityInput = z.infer<typeof updatePendingEntitySchema>;
