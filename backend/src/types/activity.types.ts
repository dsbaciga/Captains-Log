import { z } from 'zod';
import {
  optionalNullable,
  optionalNumericId,
  requiredStringWithMax,
  optionalStringWithMax,
  optionalBoolean,
  optionalDatetime,
  optionalTimezone,
  optionalNumber,
  optionalCurrencyCode,
  optionalUrlOrEmpty,
  optionalNotes,
} from '../utils/zodHelpers';

// Note: Location association is handled via EntityLink system, not direct FK
export const createActivitySchema = z.object({
  tripId: z.number(),
  parentId: optionalNumericId(),
  name: requiredStringWithMax(500),
  description: z.string().optional(),
  category: optionalStringWithMax(100),
  allDay: optionalBoolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timezone: optionalStringWithMax(100),
  cost: z.number().optional(),
  currency: z.string().length(3).optional(),
  bookingUrl: z.string().url().max(500).optional().or(z.literal('')),
  bookingReference: optionalStringWithMax(255),
  notes: z.string().optional(),
});

// Note: Location association is handled via EntityLink system, not direct FK
export const updateActivitySchema = z.object({
  parentId: optionalNumericId(),
  name: optionalNullable(requiredStringWithMax(500)),
  description: optionalNotes(),
  category: optionalStringWithMax(100),
  allDay: optionalBoolean(),
  startTime: optionalDatetime(),
  endTime: optionalDatetime(),
  timezone: optionalTimezone(),
  cost: optionalNumber(),
  currency: optionalCurrencyCode(),
  bookingUrl: optionalUrlOrEmpty(500),
  bookingReference: optionalStringWithMax(255),
  notes: optionalNotes(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

// Bulk operation schemas
export const bulkDeleteActivitiesSchema = z.object({
  ids: z.array(z.number()).min(1, 'At least one ID is required'),
});

export const bulkUpdateActivitiesSchema = z.object({
  ids: z.array(z.number()).min(1, 'At least one ID is required'),
  updates: z.object({
    category: optionalStringWithMax(100),
    notes: optionalNotes(),
    timezone: optionalTimezone(),
  }),
});

export type BulkDeleteActivitiesInput = z.infer<typeof bulkDeleteActivitiesSchema>;
export type BulkUpdateActivitiesInput = z.infer<typeof bulkUpdateActivitiesSchema>;
