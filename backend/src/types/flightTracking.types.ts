import { z } from 'zod';

/**
 * Schema for updating flight tracking info manually
 */
export const updateFlightTrackingSchema = z.object({
  flightNumber: z.string().max(50).optional().nullable(),
  airlineCode: z.string().max(10).optional().nullable(),
  gate: z.string().max(20).optional().nullable(),
  terminal: z.string().max(20).optional().nullable(),
  baggageClaim: z.string().max(20).optional().nullable(),
  status: z.enum(['scheduled', 'active', 'landed', 'cancelled', 'diverted']).optional().nullable(),
});

export type UpdateFlightTrackingInput = z.infer<typeof updateFlightTrackingSchema>;

/**
 * Flight tracking result returned from service
 */
export interface FlightTrackingResult {
  id: number;
  transportationId: number;
  flightNumber: string | null;
  airlineCode: string | null;
  status: string | null;
  gate: string | null;
  terminal: string | null;
  baggageClaim: string | null;
  departureDelay: number | null;
  arrivalDelay: number | null;
  scheduledDeparture: Date | null;
  actualDeparture: Date | null;
  scheduledArrival: Date | null;
  actualArrival: Date | null;
  lastUpdatedAt: Date;
  createdAt: Date;
}
