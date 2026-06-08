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
 * Used in: photoAlbum.service.ts (4x)
 *
 * Provides minimal location info when location is referenced from other entities.
 * Note: Most services should use locationWithAddressSelect for better user experience.
 */
export const locationSelect = {
  id: true,
  name: true,
  latitude: true,
  longitude: true,
} as const;

/**
 * Extended location select with address
 * Used in: activity.service.ts, lodging.service.ts, photoAlbum.service.ts, transportation.service.ts
 *
 * Provides location info including the address field for better display in timeline and print views.
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
  trip: {
    select: tripAccessSelect,
  },
} as const;

// ============================================================================
// Activity Patterns
// ============================================================================

/**
 * Parent activity select (minimal info for nested activities)
 * Used in: activity.service.ts
 *
 * Provides only essential parent activity info to avoid circular includes.
 */
export const parentActivitySelect = {
  id: true,
  name: true,
} as const;

/**
 * Child activity select (detailed info for sub-activities)
 * Used in: activity.service.ts
 *
 * Provides comprehensive child activity details including location and albums.
 */
export const childActivitySelect = {
  id: true,
  name: true,
  description: true,
  startTime: true,
  endTime: true,
  timezone: true,
  category: true,
  cost: true,
  currency: true,
  bookingReference: true,
  notes: true,
  status: true,
  location: { select: locationWithAddressSelect },
  photoAlbums: photoAlbumsInclude,
} as const;

/**
 * Full activity include (for single activity queries)
 * Used in: activity.service.ts
 *
 * Provides complete activity details with parent, children, location, and albums.
 */
export const activityFullInclude = {
  location: { select: locationWithAddressSelect },
  parent: { select: parentActivitySelect },
  children: {
    select: childActivitySelect,
    orderBy: [{ startTime: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  photoAlbums: photoAlbumsInclude,
} as const;

// ============================================================================
// Checklist Patterns
// ============================================================================

/**
 * Checklist item select (for checklist items)
 * Used in: checklist.service.ts
 *
 * Provides all fields needed for checklist item display and management.
 */
export const checklistItemSelect = {
  id: true,
  name: true,
  description: true,
  isChecked: true,
  sortOrder: true,
  isDefault: true,
  metadata: true,
} as const;

/**
 * Checklist with items include (for fetching checklists with their items)
 * Used in: checklist.service.ts
 *
 * Provides checklist with all items sorted by sortOrder.
 */
export const checklistWithItemsInclude = {
  items: {
    select: checklistItemSelect,
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;
