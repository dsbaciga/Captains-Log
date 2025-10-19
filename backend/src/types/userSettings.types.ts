import { z } from 'zod';

// Activity category with emoji support
export const activityCategorySchema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().min(1).max(10), // Emojis can be multiple characters due to Unicode
});

export const updateUserSettingsSchema = z.object({
  activityCategories: z.array(activityCategorySchema).optional(),
  timezone: z.string().min(1).max(100).optional(),
});

export type ActivityCategory = z.infer<typeof activityCategorySchema>;
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
