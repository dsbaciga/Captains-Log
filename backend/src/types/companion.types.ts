import { z } from 'zod';
import {
  optionalNullable,
  optionalStringWithMax,
} from '../utils/zodHelpers';

export const createCompanionSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
  relationship: z.string().max(255).optional(),
  dietaryPreferences: z.array(z.string()).optional(),
});

export const updateCompanionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: optionalNullable(z.string().email()),
  phone: optionalStringWithMax(20),
  notes: optionalStringWithMax(1000),
  relationship: optionalStringWithMax(255),
  avatarUrl: optionalStringWithMax(500),
  dietaryPreferences: z.array(z.string()).optional(),
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
