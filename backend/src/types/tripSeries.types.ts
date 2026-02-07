import { z } from 'zod';

export const createTripSeriesSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
});

export const updateTripSeriesSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
});

export const addTripToSeriesSchema = z.object({
  tripId: z.number().int().positive(),
});

export const reorderTripsInSeriesSchema = z.object({
  tripIds: z.array(z.number().int().positive()),
});

export type CreateTripSeriesInput = z.infer<typeof createTripSeriesSchema>;
export type UpdateTripSeriesInput = z.infer<typeof updateTripSeriesSchema>;
