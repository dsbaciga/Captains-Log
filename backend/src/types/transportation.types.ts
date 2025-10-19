import { z } from 'zod';

export const TransportationType = {
  FLIGHT: 'flight',
  TRAIN: 'train',
  BUS: 'bus',
  CAR: 'car',
  FERRY: 'ferry',
  BICYCLE: 'bicycle',
  WALK: 'walk',
  OTHER: 'other',
} as const;

export type TransportationTypeEnum = typeof TransportationType[keyof typeof TransportationType];

export interface Transportation {
  id: number;
  tripId: number;
  type: TransportationTypeEnum;
  fromLocationId: number | null;
  toLocationId: number | null;
  fromLocationName: string | null;
  toLocationName: string | null;
  departureTime: Date | null;
  arrivalTime: Date | null;
  carrier: string | null;
  vehicleNumber: string | null;
  confirmationNumber: string | null;
  cost: number | null;
  currency: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransportationWithLocations extends Transportation {
  fromLocation?: {
    id: number;
    name: string;
  };
  toLocation?: {
    id: number;
    name: string;
  };
}

// Validation schemas
export const createTransportationSchema = z.object({
  tripId: z.number(),
  type: z.enum([
    TransportationType.FLIGHT,
    TransportationType.TRAIN,
    TransportationType.BUS,
    TransportationType.CAR,
    TransportationType.FERRY,
    TransportationType.BICYCLE,
    TransportationType.WALK,
    TransportationType.OTHER,
  ]),
  fromLocationId: z.number().optional(),
  toLocationId: z.number().optional(),
  fromLocationName: z.string().max(500).optional(),
  toLocationName: z.string().max(500).optional(),
  departureTime: z.string().datetime().optional(),
  arrivalTime: z.string().datetime().optional(),
  carrier: z.string().max(200).optional(),
  vehicleNumber: z.string().max(100).optional(),
  confirmationNumber: z.string().max(100).optional(),
  cost: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateTransportationSchema = z.object({
  type: z.enum([
    TransportationType.FLIGHT,
    TransportationType.TRAIN,
    TransportationType.BUS,
    TransportationType.CAR,
    TransportationType.FERRY,
    TransportationType.BICYCLE,
    TransportationType.WALK,
    TransportationType.OTHER,
  ]).optional(),
  fromLocationId: z.number().optional().nullable(),
  toLocationId: z.number().optional().nullable(),
  fromLocationName: z.string().max(500).optional().nullable(),
  toLocationName: z.string().max(500).optional().nullable(),
  departureTime: z.string().datetime().optional().nullable(),
  arrivalTime: z.string().datetime().optional().nullable(),
  carrier: z.string().max(200).optional().nullable(),
  vehicleNumber: z.string().max(100).optional().nullable(),
  confirmationNumber: z.string().max(100).optional().nullable(),
  cost: z.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateTransportationInput = z.infer<typeof createTransportationSchema>;
export type UpdateTransportationInput = z.infer<typeof updateTransportationSchema>;
