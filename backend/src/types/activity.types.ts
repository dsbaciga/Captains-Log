import { z } from 'zod';

// Note: Location association is handled via EntityLink system, not direct FK
export const createActivitySchema = z.object({
  tripId: z.number(),
  parentId: z.number().optional().nullable(),
  name: z.string().min(1).max(500),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  allDay: z.boolean().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timezone: z.string().max(100).optional(),
  cost: z.number().optional(),
  currency: z.string().length(3).optional(),
  bookingUrl: z.string().url().max(500).optional().or(z.literal('')),
  bookingReference: z.string().max(255).optional(),
  notes: z.string().optional(),
});

// Note: Location association is handled via EntityLink system, not direct FK
export const updateActivitySchema = z.object({
  parentId: z.number().optional().nullable(),
  name: z.string().min(1).max(500).optional(),
  description: z.string().optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  allDay: z.boolean().optional(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
  cost: z.number().optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  bookingUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  bookingReference: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
