import { z } from 'zod';

// Activity category with emoji support
export const activityCategorySchema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().min(1).max(10), // Emojis can be multiple characters due to Unicode
});

// Trip type with emoji support (same pattern as activity categories)
export const tripTypeSchema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().min(1).max(10),
});

export const updateUserSettingsSchema = z.object({
  activityCategories: z.array(activityCategorySchema).optional(),
  tripTypes: z.array(tripTypeSchema).optional(),
  timezone: z.string().min(1).max(100).optional(),
  dietaryPreferences: z.array(z.string()).optional(),
  useCustomMapStyle: z.boolean().optional(),
});

export type ActivityCategory = z.infer<typeof activityCategorySchema>;
export type TripType = z.infer<typeof tripTypeSchema>;
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
