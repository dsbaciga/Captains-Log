import prisma from '../config/database';
import { AppError } from './errors';

/**
 * Service helper utilities to reduce duplication across service files
 * Provides common patterns for:
 * - Trip ownership verification
 * - Entity access verification
 * - Location validation
 * - Update data building
 */

/**
 * Verifies user owns the trip
 * @throws {AppError} 404 if trip not found or access denied
 */
export async function verifyTripAccess(
  userId: number,
  tripId: number
): Promise<void> {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId },
  });

  if (!trip) {
    throw new AppError('Trip not found or access denied', 404);
  }
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
 */
export async function verifyLocationInTrip(
  locationId: number,
  tripId: number
): Promise<void> {
  const location = await prisma.location.findFirst({
    where: { id: locationId, tripId },
  });

  if (!location) {
    throw new AppError('Location not found or does not belong to trip', 404);
  }
}

/**
 * Verifies photo belongs to specified trip
 * @throws {AppError} 404 if photo not found or doesn't belong to trip
 */
export async function verifyPhotoInTrip(
  photoId: number,
  tripId: number
): Promise<void> {
  const photo = await prisma.photo.findFirst({
    where: { id: photoId, tripId },
  });

  if (!photo) {
    throw new AppError('Photo not found or does not belong to trip', 404);
  }
}

/**
 * Verifies album belongs to user
 * @throws {AppError} 404 if album not found, 403 if access denied
 */
export async function verifyAlbumAccess(
  albumId: number,
  userId: number
): Promise<void> {
  const album = await prisma.photoAlbum.findFirst({
    where: {
      id: albumId,
      trip: { userId }
    },
    include: { trip: true }
  });

  if (!album) {
    throw new AppError('Album not found or access denied', 404);
  }
}

/**
 * Verifies activity belongs to user's trip
 * @throws {AppError} 404 if not found, 403 if access denied
 */
export async function verifyActivityAccess(
  activityId: number,
  userId: number
): Promise<void> {
  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      trip: { userId }
    },
    include: { trip: true }
  });

  if (!activity) {
    throw new AppError('Activity not found or access denied', 404);
  }
}

/**
 * Verifies lodging belongs to user's trip
 * @throws {AppError} 404 if not found, 403 if access denied
 */
export async function verifyLodgingAccess(
  lodgingId: number,
  userId: number
): Promise<void> {
  const lodging = await prisma.lodging.findFirst({
    where: {
      id: lodgingId,
      trip: { userId }
    },
    include: { trip: true }
  });

  if (!lodging) {
    throw new AppError('Lodging not found or access denied', 404);
  }
}

/**
 * Verifies transportation belongs to user's trip
 * @throws {AppError} 404 if not found, 403 if access denied
 */
export async function verifyTransportationAccess(
  transportationId: number,
  userId: number
): Promise<void> {
  const transportation = await prisma.transportation.findFirst({
    where: {
      id: transportationId,
      trip: { userId }
    },
    include: { trip: true }
  });

  if (!transportation) {
    throw new AppError('Transportation not found or access denied', 404);
  }
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
