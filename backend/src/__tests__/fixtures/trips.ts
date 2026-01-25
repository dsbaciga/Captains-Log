/**
 * Test trip data fixtures for Travel Life application backend tests
 */

import { testUsers } from './users';

// Trip status values (matching backend TripStatus)
export const TripStatus = {
  DREAM: 'Dream',
  PLANNING: 'Planning',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export type TripStatusType = typeof TripStatus[keyof typeof TripStatus];

// Privacy level values
export const PrivacyLevel = {
  PRIVATE: 'Private',
  SHARED: 'Shared',
  PUBLIC: 'Public',
} as const;

export type PrivacyLevelType = typeof PrivacyLevel[keyof typeof PrivacyLevel];

export interface TestTrip {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  timezone: string | null;
  status: TripStatusType;
  privacyLevel: PrivacyLevelType;
  coverPhotoId: number | null;
  bannerPhotoId: number | null;
  addToPlacesVisited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const testTrips: Record<string, TestTrip> = {
  // Planning status trip
  planningTrip: {
    id: 1,
    userId: testUsers.user1.id,
    title: 'Summer Vacation to Italy',
    description: 'A wonderful trip to explore Rome, Florence, and Venice',
    startDate: new Date('2024-07-01'),
    endDate: new Date('2024-07-15'),
    timezone: 'Europe/Rome',
    status: TripStatus.PLANNING,
    privacyLevel: PrivacyLevel.PRIVATE,
    coverPhotoId: null,
    bannerPhotoId: null,
    addToPlacesVisited: true,
    createdAt: new Date('2024-01-15T00:00:00Z'),
    updatedAt: new Date('2024-01-15T00:00:00Z'),
  },

  // Dream status trip (no dates)
  dreamTrip: {
    id: 2,
    userId: testUsers.user1.id,
    title: 'Japan Cherry Blossom Tour',
    description: 'Dream trip to see cherry blossoms in Japan',
    startDate: null,
    endDate: null,
    timezone: null,
    status: TripStatus.DREAM,
    privacyLevel: PrivacyLevel.PRIVATE,
    coverPhotoId: null,
    bannerPhotoId: null,
    addToPlacesVisited: false,
    createdAt: new Date('2024-01-20T00:00:00Z'),
    updatedAt: new Date('2024-01-20T00:00:00Z'),
  },

  // Planned status trip
  plannedTrip: {
    id: 3,
    userId: testUsers.user1.id,
    title: 'Paris Weekend Getaway',
    description: 'Quick weekend trip to Paris',
    startDate: new Date('2024-05-01'),
    endDate: new Date('2024-05-03'),
    timezone: 'Europe/Paris',
    status: TripStatus.PLANNED,
    privacyLevel: PrivacyLevel.PRIVATE,
    coverPhotoId: null,
    bannerPhotoId: null,
    addToPlacesVisited: true,
    createdAt: new Date('2024-02-01T00:00:00Z'),
    updatedAt: new Date('2024-02-01T00:00:00Z'),
  },

  // In Progress trip
  inProgressTrip: {
    id: 4,
    userId: testUsers.user1.id,
    title: 'London Business Trip',
    description: 'Business conference in London',
    startDate: new Date('2024-03-10'),
    endDate: new Date('2024-03-15'),
    timezone: 'Europe/London',
    status: TripStatus.IN_PROGRESS,
    privacyLevel: PrivacyLevel.SHARED,
    coverPhotoId: null,
    bannerPhotoId: null,
    addToPlacesVisited: false,
    createdAt: new Date('2024-02-15T00:00:00Z'),
    updatedAt: new Date('2024-03-10T00:00:00Z'),
  },

  // Completed trip
  completedTrip: {
    id: 5,
    userId: testUsers.user1.id,
    title: 'New York City Trip',
    description: 'Amazing trip to NYC',
    startDate: new Date('2023-12-20'),
    endDate: new Date('2023-12-28'),
    timezone: 'America/New_York',
    status: TripStatus.COMPLETED,
    privacyLevel: PrivacyLevel.PUBLIC,
    coverPhotoId: 1,
    bannerPhotoId: 2,
    addToPlacesVisited: true,
    createdAt: new Date('2023-11-01T00:00:00Z'),
    updatedAt: new Date('2023-12-29T00:00:00Z'),
  },

  // Cancelled trip
  cancelledTrip: {
    id: 6,
    userId: testUsers.user1.id,
    title: 'Cancelled Beach Trip',
    description: 'Trip that was cancelled due to weather',
    startDate: new Date('2024-04-01'),
    endDate: new Date('2024-04-05'),
    timezone: 'America/Los_Angeles',
    status: TripStatus.CANCELLED,
    privacyLevel: PrivacyLevel.PRIVATE,
    coverPhotoId: null,
    bannerPhotoId: null,
    addToPlacesVisited: false,
    createdAt: new Date('2024-02-20T00:00:00Z'),
    updatedAt: new Date('2024-03-25T00:00:00Z'),
  },

  // Trip belonging to user2
  user2Trip: {
    id: 7,
    userId: testUsers.user2.id,
    title: 'Barcelona Adventure',
    description: 'Exploring Barcelona and the Costa Brava',
    startDate: new Date('2024-08-01'),
    endDate: new Date('2024-08-10'),
    timezone: 'Europe/Madrid',
    status: TripStatus.PLANNING,
    privacyLevel: PrivacyLevel.PRIVATE,
    coverPhotoId: null,
    bannerPhotoId: null,
    addToPlacesVisited: true,
    createdAt: new Date('2024-01-25T00:00:00Z'),
    updatedAt: new Date('2024-01-25T00:00:00Z'),
  },
};

/**
 * Create a test trip with optional overrides
 */
export const createTestTrip = (overrides: Partial<TestTrip> = {}): TestTrip => ({
  ...testTrips.planningTrip,
  ...overrides,
});

/**
 * Valid trip creation input
 */
export const validCreateTripInput = {
  title: 'New Test Trip',
  description: 'A test trip description',
  startDate: '2024-06-01',
  endDate: '2024-06-10',
  timezone: 'America/New_York',
  status: TripStatus.PLANNING,
  privacyLevel: PrivacyLevel.PRIVATE,
  addToPlacesVisited: false,
};

/**
 * Minimal trip creation input (only required fields)
 */
export const minimalCreateTripInput = {
  title: 'Minimal Trip',
};

/**
 * Valid trip update input
 */
export const validUpdateTripInput = {
  title: 'Updated Trip Title',
  description: 'Updated description',
  status: TripStatus.PLANNED,
};

/**
 * Invalid trip inputs for validation testing
 */
export const invalidTripInputs = {
  emptyTitle: {
    title: '',
    description: 'Valid description',
  },
  titleTooLong: {
    title: 'A'.repeat(501), // Exceeds 500 char limit
    description: 'Valid description',
  },
  invalidStatus: {
    title: 'Valid Title',
    status: 'InvalidStatus' as TripStatusType,
  },
  invalidPrivacy: {
    title: 'Valid Title',
    privacyLevel: 'InvalidPrivacy' as PrivacyLevelType,
  },
};

/**
 * Get trips for a specific user
 */
export const getTripsForUser = (userId: number): TestTrip[] => {
  return Object.values(testTrips).filter(trip => trip.userId === userId);
};

/**
 * Get trips by status
 */
export const getTripsByStatus = (status: TripStatusType): TestTrip[] => {
  return Object.values(testTrips).filter(trip => trip.status === status);
};
