import { z } from 'zod';

// Validation schemas
export const createLocationSchema = z.object({
  tripId: z.number(),
  parentId: z.number().optional(),
  name: z.string().min(1).max(500),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  categoryId: z.number().optional(),
  visitDatetime: z.string().optional(), // ISO datetime string
  visitDurationMinutes: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const updateLocationSchema = z.object({
  parentId: z.number().nullable().optional(),
  name: z.string().min(1).max(500).optional(),
  address: z.string().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  categoryId: z.number().nullable().optional(),
  visitDatetime: z.string().nullable().optional(),
  visitDurationMinutes: z.number().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const createLocationCategorySchema = z.object({
  name: z.string().min(1).max(255),
  icon: z.string().max(100).optional(),
  color: z.string().max(7).optional(), // Hex color code
});

export const updateLocationCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  icon: z.string().max(100).nullable().optional(),
  color: z.string().max(7).nullable().optional(),
});

// Types
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type CreateLocationCategoryInput = z.infer<typeof createLocationCategorySchema>;
export type UpdateLocationCategoryInput = z.infer<typeof updateLocationCategorySchema>;

export interface LocationResponse {
  id: number;
  tripId: number;
  parentId: number | null;
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
  parent?: {
    id: number;
    name: string;
  } | null;
  children?: LocationResponse[];
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
