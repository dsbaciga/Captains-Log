import { z } from 'zod';

export const createCompanionSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
  relationship: z.string().max(255).optional(),
});

export const updateCompanionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  relationship: z.string().max(255).optional().nullable(),
  avatarUrl: z.string().max(500).optional().nullable(),
});

export const linkCompanionToTripSchema = z.object({
  tripId: z.number(),
  companionId: z.number(),
});

export type CreateCompanionInput = z.infer<typeof createCompanionSchema>;
export type UpdateCompanionInput = z.infer<typeof updateCompanionSchema>;
export type LinkCompanionToTripInput = z.infer<typeof linkCompanionToTripSchema>;

// Internal type for creating the "Myself" companion
export interface CreateMyselfCompanionInput {
  name: string;
  isMyself: true;
}
