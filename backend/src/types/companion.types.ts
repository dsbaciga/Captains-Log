import { z } from 'zod';
import {
  optionalNullable,
  optionalStringWithMax,
} from '../validation/zodHelpers';

export const createCompanionSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
  relationship: z.string().max(255).optional(),
  dietaryPreferences: z.array(z.string()).optional(),
  // Emergency-card medical fields. `allergies` is deliberately shaped like
  // dietaryPreferences (a Json string array with a `[]` default) so one control
  // edits both, but it is never nullable: clearing it means an empty list, and a
  // SQL NULL in a non-nullable Json column would need Prisma.DbNull.
  medicalNotes: z.string().max(2000).optional(),
  allergies: z.array(z.string().max(100)).max(50).optional(),
});

export const updateCompanionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: optionalNullable(z.string().email()),
  phone: optionalStringWithMax(20),
  notes: optionalStringWithMax(1000),
  relationship: optionalStringWithMax(255),
  // avatarUrl is deliberately absent: it is server-managed and written only by
  // uploadAvatar/setImmichAvatar/deleteAvatar. Accepting it here made the stored
  // path attacker-controlled, and those handlers unlink whatever it names.
  dietaryPreferences: z.array(z.string()).optional(),
  medicalNotes: optionalStringWithMax(2000),
  // Not nullable, unlike the other update fields: the column is a non-nullable
  // Json array, so "clear it" is `[]`, not null.
  allergies: z.array(z.string().max(100)).max(50).optional(),
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
