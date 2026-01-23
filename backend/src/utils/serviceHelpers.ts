import prisma from '../config/database';
import { AppError } from './errors';
import { Prisma } from '@prisma/client';

/**
 * Service helper utilities to reduce duplication across service files
 * Provides common patterns for:
 * - Trip ownership verification
 * - Entity access verification
 * - Location validation
 * - Update data building
 */

/**
 * Entity types that support ownership verification
 */
export type VerifiableEntityType =
  | 'location'
  | 'photo'
  | 'activity'
  | 'lodging'
  | 'transportation'
  | 'journalEntry'
  | 'album';

/**
 * Configuration for each entity type's Prisma model and display name
 */
interface EntityConfig {
  model: keyof typeof prisma;
  displayName: string;
}

const entityConfigs: Record<VerifiableEntityType, EntityConfig> = {
  location: { model: 'location', displayName: 'Location' },
  photo: { model: 'photo', displayName: 'Photo' },
  activity: { model: 'activity', displayName: 'Activity' },
  lodging: { model: 'lodging', displayName: 'Lodging' },
  transportation: { model: 'transportation', displayName: 'Transportation' },
  journalEntry: { model: 'journalEntry', displayName: 'Journal entry' },
  album: { model: 'photoAlbum', displayName: 'Album' },
};

/**
 * Generic function to verify entity exists and belongs to a specific trip
 * Consolidates verifyLocationInTrip, verifyPhotoInTrip, etc.
 *
 * @param entityType - The type of entity to verify
 * @param entityId - The ID of the entity
 * @param tripId - The trip ID to verify against
 * @throws {AppError} 404 if entity not found or doesn't belong to trip
 */
export async function verifyEntityInTrip(
  entityType: VerifiableEntityType,
  entityId: number,
  tripId: number
): Promise<void> {
  const config = entityConfigs[entityType];
  // TypeScript cannot infer the correct model type from a dynamic key lookup.
  // The entityConfigs mapping ensures config.model is always a valid Prisma model name,
  // so this cast is safe. Prisma's generated types don't support dynamic model access.
  const model = prisma[config.model] as any;

  const entity = await model.findFirst({
    where: { id: entityId, tripId },
  });

  if (!entity) {
    throw new AppError(`${config.displayName} not found or does not belong to trip`, 404);
  }
}

/**
 * Generic function to verify entity exists and user owns the associated trip
 * Consolidates verifyAlbumAccess, verifyActivityAccess, verifyLodgingAccess, etc.
 *
 * @param entityType - The type of entity to verify
 * @param entityId - The ID of the entity
 * @param userId - The user ID to verify ownership against
 * @throws {AppError} 404 if entity not found or access denied
 * @returns The entity with trip included if verification passes
 */
export async function verifyEntityAccessById<T = any>(
  entityType: VerifiableEntityType,
  entityId: number,
  userId: number
): Promise<T> {
  const config = entityConfigs[entityType];
  // TypeScript cannot infer the correct model type from a dynamic key lookup.
  // The entityConfigs mapping ensures config.model is always a valid Prisma model name,
  // so this cast is safe. Prisma's generated types don't support dynamic model access.
  const model = prisma[config.model] as any;

  const entity = await model.findFirst({
    where: {
      id: entityId,
      trip: { userId },
    },
    include: { trip: true },
  });

  if (!entity) {
    throw new AppError(`${config.displayName} not found or access denied`, 404);
  }

  return entity as T;
}

/**
 * Verifies user owns the trip
 * @throws {AppError} 404 if trip not found or access denied
 * @returns The trip if access is granted
 */
export async function verifyTripAccess(
  userId: number,
  tripId: number
) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId },
  });

  if (!trip) {
    throw new AppError('Trip not found or access denied', 404);
  }

  return trip;
}

/**
 * Verifies entity belongs to user's trip
 * @throws {AppError} 404 if entity not found, 403 if access denied
 * @returns The entity if access is granted
 */
export async function verifyEntityAccess<T extends { trip: { userId: number } }>(
  entity: T | null,
  userId: number,
  entityName: string
): Promise<T> {
  if (!entity) {
    throw new AppError(`${entityName} not found`, 404);
  }

  if (entity.trip.userId !== userId) {
    throw new AppError('Access denied', 403);
  }

  return entity;
}

/**
 * Verifies location belongs to specified trip
 * @throws {AppError} 404 if location not found or doesn't belong to trip
 * @deprecated Use verifyEntityInTrip('location', locationId, tripId) instead
 */
export async function verifyLocationInTrip(
  locationId: number,
  tripId: number
): Promise<void> {
  return verifyEntityInTrip('location', locationId, tripId);
}

/**
 * Verifies photo belongs to specified trip
 * @throws {AppError} 404 if photo not found or doesn't belong to trip
 * @deprecated Use verifyEntityInTrip('photo', photoId, tripId) instead
 */
export async function verifyPhotoInTrip(
  photoId: number,
  tripId: number
): Promise<void> {
  return verifyEntityInTrip('photo', photoId, tripId);
}

/**
 * Verifies album belongs to user
 * @throws {AppError} 404 if album not found, 403 if access denied
 * @deprecated Use verifyEntityAccessById('album', albumId, userId) instead
 */
export async function verifyAlbumAccess(
  albumId: number,
  userId: number
): Promise<void> {
  await verifyEntityAccessById('album', albumId, userId);
}

/**
 * Verifies activity belongs to user's trip
 * @throws {AppError} 404 if not found, 403 if access denied
 * @deprecated Use verifyEntityAccessById('activity', activityId, userId) instead
 */
export async function verifyActivityAccess(
  activityId: number,
  userId: number
): Promise<void> {
  await verifyEntityAccessById('activity', activityId, userId);
}

/**
 * Verifies lodging belongs to user's trip
 * @throws {AppError} 404 if not found, 403 if access denied
 * @deprecated Use verifyEntityAccessById('lodging', lodgingId, userId) instead
 */
export async function verifyLodgingAccess(
  lodgingId: number,
  userId: number
): Promise<void> {
  await verifyEntityAccessById('lodging', lodgingId, userId);
}

/**
 * Verifies transportation belongs to user's trip
 * @throws {AppError} 404 if not found, 403 if access denied
 * @deprecated Use verifyEntityAccessById('transportation', transportationId, userId) instead
 */
export async function verifyTransportationAccess(
  transportationId: number,
  userId: number
): Promise<void> {
  await verifyEntityAccessById('transportation', transportationId, userId);
}

/**
 * Builds update data object, converting empty strings to null
 * Only includes fields that are defined (not undefined)
 * This ensures empty fields are cleared in updates
 */
export function buildUpdateData<T extends Record<string, any>>(
  data: Partial<T>
): Partial<T> {
  const updateData: Partial<T> = {};

  for (const key in data) {
    if (data[key] !== undefined) {
      // Convert empty strings to null for updates to clear fields
      updateData[key] = (data[key] === '' ? null : data[key]) as any;
    }
  }

  return updateData;
}

/**
 * Enhanced update data builder with conditional field inclusion and transformers
 * Eliminates the pattern: if (data.field !== undefined) updateData.field = data.field
 *
 * This function only includes fields that are explicitly defined (not undefined),
 * allowing partial updates where omitted fields remain unchanged in the database.
 *
 * @template T - The data type (typically a Partial<EntityInput>)
 * @param data - Partial data object with fields to update
 * @param options - Configuration options
 * @param options.emptyStringToNull - Convert empty strings to null (default: true)
 * @param options.transformers - Custom field transformers (e.g., date conversion)
 *
 * @returns Update data object with only defined fields, optionally transformed
 *
 * @example
 * ```typescript
 * // Simple usage (converts empty strings to null)
 * const updateData = buildConditionalUpdateData(data);
 *
 * // With date transformers
 * const updateData = buildConditionalUpdateData(data, {
 *   transformers: {
 *     startDate: tripDateTransformer,
 *     endDate: tripDateTransformer,
 *   }
 * });
 * ```
 */
export function buildConditionalUpdateData<T extends Record<string, any>>(
  data: Partial<T>,
  options: {
    emptyStringToNull?: boolean;
    transformers?: Record<string, (value: any) => any>;
  } = {}
): Partial<T> {
  const { emptyStringToNull = true, transformers = {} } = options;
  const updateData: Partial<T> = {};

  for (const key in data) {
    const value = data[key];

    // Only include defined values (skip undefined to preserve existing values)
    if (value !== undefined) {
      // Apply custom transformer if exists
      if (transformers[key]) {
        updateData[key] = transformers[key](value);
      }
      // Convert empty strings to null
      else if (emptyStringToNull && value === '') {
        updateData[key] = null as any;
      }
      // Include as-is
      else {
        updateData[key] = value;
      }
    }
  }

  return updateData;
}

/**
 * Transformer for trip date fields (common pattern)
 * Converts date strings to UTC Date objects with T00:00:00.000Z
 *
 * @param dateStr - Date string (YYYY-MM-DD) or null
 * @returns Date object in UTC or null
 *
 * @example
 * ```typescript
 * tripDateTransformer("2025-01-15") // Date("2025-01-15T00:00:00.000Z")
 * tripDateTransformer(null) // null
 * ```
 */
export function tripDateTransformer(dateStr: string | null): Date | null {
  return dateStr ? new Date(dateStr + 'T00:00:00.000Z') : null;
}

/**
 * Generic function to verify entity ownership through trip relationship
 * More flexible version that works with any entity type
 */
export async function verifyEntityOwnership<T extends { trip: { userId: number } }>(
  findQuery: () => Promise<T | null>,
  userId: number,
  entityName: string
): Promise<T> {
  const entity = await findQuery();
  return verifyEntityAccess(entity, userId, entityName);
}

/**
 * Recursively converts Decimal objects (from Prisma) to numbers
 * Useful for ensuring JSON responses have numbers instead of Decimal objects
 *
 * @param obj - The object or array containing Decimal fields
 * @returns The object with Decimals converted to numbers
 */
export function convertDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Prisma.Decimal) {
    return Number(obj) as any;
  }

  if (obj instanceof Date) {
    return obj as any;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertDecimals(item)) as any;
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = convertDecimals(obj[key]);
      }
    }
    return result as T;
  }

  return obj;
}
