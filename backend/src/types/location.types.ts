import { z } from 'zod';

// Validation schemas
export const createLocationSchema = z.object({
  tripId: z.number(),
  name: z.string().min(1).max(500),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  categoryId: z.number().optional(),
  visitDatetime: z.string().optional(), // ISO datetime string
  visitDurationMinutes: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const updateLocationSchema = createLocationSchema.partial().omit({ tripId: true });

export const createLocationCategorySchema = z.object({
  name: z.string().min(1).max(255),
  icon: z.string().max(100).optional(),
  color: z.string().max(7).optional(), // Hex color code
});

export const updateLocationCategorySchema = createLocationCategorySchema.partial();

// Types
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type CreateLocationCategoryInput = z.infer<typeof createLocationCategorySchema>;
export type UpdateLocationCategoryInput = z.infer<typeof updateLocationCategorySchema>;

export interface LocationResponse {
  id: number;
  tripId: number;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  categoryId: number | null;
  visitDatetime: string | null;
  visitDurationMinutes: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: number;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
}

export interface LocationCategoryResponse {
  id: number;
  userId: number | null;
  name: string;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  createdAt: string;
}
