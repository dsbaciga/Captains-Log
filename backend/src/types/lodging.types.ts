import { z } from 'zod';

export const LodgingType = {
  HOTEL: 'hotel',
  HOSTEL: 'hostel',
  AIRBNB: 'airbnb',
  VACATION_RENTAL: 'vacation_rental',
  CAMPING: 'camping',
  RESORT: 'resort',
  MOTEL: 'motel',
  BED_AND_BREAKFAST: 'bed_and_breakfast',
  APARTMENT: 'apartment',
  FRIENDS_FAMILY: 'friends_family',
  OTHER: 'other',
} as const;

export type LodgingTypeEnum = typeof LodgingType[keyof typeof LodgingType];

// Note: Location association is handled via EntityLink system, not direct FK
export interface Lodging {
  id: number;
  tripId: number;
  type: LodgingTypeEnum;
  name: string;
  address: string | null;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  timezone: string | null;
  confirmationNumber: string | null;
  cost: number | null;
  currency: string | null;
  bookingUrl: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Note: Location association is handled via EntityLink system, not direct FK
// Validation schemas
export const createLodgingSchema = z.object({
  tripId: z.number(),
  type: z.enum([
    LodgingType.HOTEL,
    LodgingType.HOSTEL,
    LodgingType.AIRBNB,
    LodgingType.VACATION_RENTAL,
    LodgingType.CAMPING,
    LodgingType.RESORT,
    LodgingType.MOTEL,
    LodgingType.BED_AND_BREAKFAST,
    LodgingType.APARTMENT,
    LodgingType.FRIENDS_FAMILY,
    LodgingType.OTHER,
  ]),
  name: z.string().min(1).max(500),
  address: z.string().max(1000).optional(),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  timezone: z.string().max(100).optional(),
  confirmationNumber: z.string().max(100).optional(),
  cost: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  bookingUrl: z.string().url().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

// Note: Location association is handled via EntityLink system, not direct FK
export const updateLodgingSchema = z.object({
  type: z.enum([
    LodgingType.HOTEL,
    LodgingType.HOSTEL,
    LodgingType.AIRBNB,
    LodgingType.VACATION_RENTAL,
    LodgingType.CAMPING,
    LodgingType.RESORT,
    LodgingType.MOTEL,
    LodgingType.BED_AND_BREAKFAST,
    LodgingType.APARTMENT,
    LodgingType.FRIENDS_FAMILY,
    LodgingType.OTHER,
  ]).optional(),
  name: z.string().min(1).max(500).optional(),
  address: z.string().max(1000).optional().nullable(),
  checkInDate: z.string().optional().nullable(),
  checkOutDate: z.string().optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
  confirmationNumber: z.string().max(100).optional().nullable(),
  cost: z.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  bookingUrl: z.string().url().max(1000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateLodgingInput = z.infer<typeof createLodgingSchema>;
export type UpdateLodgingInput = z.infer<typeof updateLodgingSchema>;
