import { z } from 'zod';

// Trip status enum
export const TripStatus = {
  DREAM: 'Dream',
  PLANNING: 'Planning',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export const TripStatusValues = Object.values(TripStatus);

// Privacy level enum
export const PrivacyLevel = {
  PRIVATE: 'Private',
  SHARED: 'Shared',
  PUBLIC: 'Public',
} as const;

export const PrivacyLevelValues = Object.values(PrivacyLevel);

// Validation schemas
/**
 * @openapi
 * components:
 *   schemas:
 *     CreateTripInput:
 *       type: object
 *       required: [title]
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         timezone:
 *           type: string
 *         status:
 *           type: string
 *           enum: [Dream, Planning, Planned, In Progress, Completed, Cancelled]
 *         privacyLevel:
 *           type: string
 *           enum: [Private, Shared, Public]
 *         addToPlacesVisited:
 *           type: boolean
 */
export const createTripSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(), // ISO date string
  timezone: z.string().max(100).optional(),
  status: z.enum([
    TripStatus.DREAM,
    TripStatus.PLANNING,
    TripStatus.PLANNED,
    TripStatus.IN_PROGRESS,
    TripStatus.COMPLETED,
    TripStatus.CANCELLED,
  ]).default(TripStatus.PLANNING),
  privacyLevel: z.enum([
    PrivacyLevel.PRIVATE,
    PrivacyLevel.SHARED,
    PrivacyLevel.PUBLIC,
  ]).default(PrivacyLevel.PRIVATE),
  addToPlacesVisited: z.boolean().optional(),
});

export const updateTripSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  timezone: z.string().max(100).nullable().optional(),
  status: z.enum([
    TripStatus.DREAM,
    TripStatus.PLANNING,
    TripStatus.PLANNED,
    TripStatus.IN_PROGRESS,
    TripStatus.COMPLETED,
    TripStatus.CANCELLED,
  ]).optional(),
  privacyLevel: z.enum([
    PrivacyLevel.PRIVATE,
    PrivacyLevel.SHARED,
    PrivacyLevel.PUBLIC,
  ]).optional(),
  addToPlacesVisited: z.boolean().optional(),
});

export const getTripQuerySchema = z.object({
  status: z.enum([...TripStatusValues as [string, ...string[]]]).optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.enum(['startDate-desc', 'startDate-asc', 'title-asc', 'title-desc', 'status']).optional(),
  startDateFrom: z.string().optional(),
  startDateTo: z.string().optional(),
  tags: z.string().optional(), // Comma-separated tag IDs
});

// Types
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type GetTripQuery = z.infer<typeof getTripQuerySchema>;

export interface TripResponse {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  timezone: string | null;
  status: string;
  privacyLevel: string;
  addToPlacesVisited: boolean;
  coverPhotoId: number | null;
  bannerPhotoId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripListResponse {
  trips: TripResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Trip duplication schema
export const duplicateTripSchema = z.object({
  title: z.string().min(1).max(500),
  copyEntities: z.object({
    locations: z.boolean().optional().default(false),
    photos: z.boolean().optional().default(false),
    activities: z.boolean().optional().default(false),
    transportation: z.boolean().optional().default(false),
    lodging: z.boolean().optional().default(false),
    journalEntries: z.boolean().optional().default(false),
    photoAlbums: z.boolean().optional().default(false),
    tags: z.boolean().optional().default(false),
    companions: z.boolean().optional().default(false),
    checklists: z.boolean().optional().default(false),
  }).optional().default({}),
});

export type DuplicateTripInput = z.infer<typeof duplicateTripSchema>;
