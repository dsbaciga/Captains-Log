/**
 * Prisma Include Constants
 *
 * Reusable Prisma include patterns to eliminate duplication across service files.
 * These constants provide a single source of truth for common include patterns.
 *
 * Benefits:
 * - Eliminates 200+ lines of duplicated include blocks
 * - Ensures consistency across all services
 * - Easy to update include patterns in one place
 */

/**
 * Standard journal assignment include
 * Used in: transportation.service.ts (4x), activity.service.ts (2x), lodging.service.ts (2x)
 *
 * Provides journal entries associated with entities through the journalAssignments relation.
 */
export const journalAssignmentsInclude = {
  select: {
    id: true,
    journal: {
      select: {
        id: true,
        title: true,
        content: true,
        date: true,
        entryType: true,
      },
    },
  },
} as const;

/**
 * Standard photo album include with photo count
 * Used in: activity.service.ts (2x), location.service.ts (2x),
 *          lodging.service.ts (2x), photoAlbum.service.ts (3x)
 *
 * Provides photo albums with a count of photos in each album.
 */
export const photoAlbumsInclude = {
  select: {
    id: true,
    name: true,
    description: true,
    _count: {
      select: { photoAssignments: true },
    },
  },
} as const;

/**
 * Standard location select (for relations)
 * Used in: activity.service.ts (4x), photoAlbum.service.ts (4x),
 *          transportation.service.ts (2x)
 *
 * Provides minimal location info when location is referenced from other entities.
 */
export const locationSelect = {
  id: true,
  name: true,
  latitude: true,
  longitude: true,
} as const;

/**
 * Extended location select with address
 * Used in: lodging.service.ts, photoAlbum.service.ts
 *
 * Provides location info including the address field.
 */
export const locationWithAddressSelect = {
  id: true,
  name: true,
  address: true,
  latitude: true,
  longitude: true,
} as const;

/**
 * Trip access select (minimal trip info for ownership verification)
 * Used across multiple services for access control checks
 *
 * Provides only the fields needed to verify trip ownership.
 */
export const tripAccessSelect = {
  userId: true,
  privacyLevel: true,
} as const;

/**
 * Location with category include
 * Used in: location.service.ts
 *
 * Provides full location details including category and related entities.
 */
export const locationWithCategoryInclude = {
  category: true,
  photoAlbums: photoAlbumsInclude,
  journalLocationAssignments: {
    select: {
      id: true,
      journal: {
        select: {
          id: true,
          title: true,
          content: true,
          date: true,
          entryType: true,
        },
      },
    },
  },
  trip: {
    select: tripAccessSelect,
  },
} as const;
