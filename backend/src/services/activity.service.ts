import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { CreateActivityInput, UpdateActivityInput } from '../types/activity.types';
import { verifyTripAccess, verifyEntityAccess, convertDecimals } from '../utils/serviceHelpers';
import { photoAlbumsInclude } from '../utils/prismaIncludes';

// Note: Location association is handled via EntityLink system, not direct FK

class ActivityService {
  async createActivity(userId: number, data: CreateActivityInput) {
    // Verify user owns the trip
    await verifyTripAccess(userId, data.tripId);

    // Verify parent activity exists and belongs to same trip if provided
    if (data.parentId) {
      const parentActivity = await prisma.activity.findFirst({
        where: { id: data.parentId, tripId: data.tripId },
      });

      if (!parentActivity) {
        throw new AppError('Parent activity not found or does not belong to trip', 404);
      }
    }

    // Note: Location association is handled via EntityLink system after creation
    const activity = await prisma.activity.create({
      data: {
        tripId: data.tripId,
        parentId: data.parentId || null,
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
        cost: data.cost !== undefined ? data.cost : null,
        currency: data.currency || null,
        bookingUrl: data.bookingUrl || null,
        bookingReference: data.bookingReference || null,
        notes: data.notes || null,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return convertDecimals(activity);
  }

  async getActivitiesByTrip(userId: number, tripId: number) {
    // Verify user has access to trip
    await verifyTripAccess(userId, tripId);

    // Note: Location association is fetched via EntityLink system, not direct FK
    const activities = await prisma.activity.findMany({
      where: { tripId },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
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
            photoAlbums: photoAlbumsInclude,
          },
          orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
        },
        photoAlbums: photoAlbumsInclude,
      },
      orderBy: [
        { manualOrder: { sort: 'asc', nulls: 'last' } },
        { startTime: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' }
      ],
    });

    return convertDecimals(activities);
  }

  async getActivityById(userId: number, activityId: number) {
    // Note: Location association is fetched via EntityLink system, not direct FK
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        trip: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
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
            photoAlbums: photoAlbumsInclude,
          },
          orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
        },
        photoAlbums: photoAlbumsInclude,
      },
    });

    await verifyEntityAccess(activity, userId, 'Activity');

    return convertDecimals(activity);
  }

  async updateActivity(
    userId: number,
    activityId: number,
    data: UpdateActivityInput
  ) {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { trip: true },
    });

    await verifyEntityAccess(activity, userId, 'Activity');

    // Verify parent activity exists and belongs to same trip if provided
    if (data.parentId) {
      const parentActivity = await prisma.activity.findFirst({
        where: { id: data.parentId, tripId: activity!.tripId },
      });

      if (!parentActivity) {
        throw new AppError('Parent activity not found or does not belong to trip', 404);
      }

      // Prevent circular reference - activity cannot be its own parent
      if (data.parentId === activityId) {
        throw new AppError('Activity cannot be its own parent', 400);
      }
    }

    // Note: Location association is handled via EntityLink system, not direct FK
    const updatedActivity = await prisma.activity.update({
      where: { id: activityId },
      data: {
        parentId: data.parentId !== undefined ? data.parentId : undefined,
        name: data.name,
        description: data.description !== undefined ? data.description : undefined,
        category: data.category !== undefined ? data.category : undefined,
        allDay: data.allDay !== undefined ? data.allDay : undefined,
        startTime:
          data.startTime !== undefined
            ? data.startTime
              ? new Date(data.startTime)
              : null
            : undefined,
        endTime:
          data.endTime !== undefined
            ? data.endTime
              ? new Date(data.endTime)
              : null
            : undefined,
        timezone: data.timezone !== undefined ? data.timezone : undefined,
        cost: data.cost !== undefined ? data.cost : undefined,
        currency: data.currency !== undefined ? data.currency : undefined,
        bookingUrl: data.bookingUrl !== undefined ? data.bookingUrl : undefined,
        bookingReference:
          data.bookingReference !== undefined ? data.bookingReference : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return convertDecimals(updatedActivity);
  }

  async deleteActivity(userId: number, activityId: number) {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { trip: true },
    });

    const verifiedActivity = await verifyEntityAccess(activity, userId, 'Activity');

    // Clean up entity links before deleting
    await prisma.entityLink.deleteMany({
      where: {
        tripId: verifiedActivity.tripId,
        OR: [
          { sourceType: 'ACTIVITY', sourceId: activityId },
          { targetType: 'ACTIVITY', targetId: activityId },
        ],
      },
    });

    await prisma.activity.delete({
      where: { id: activityId },
    });

    return { success: true };
  }
}

export default new ActivityService();
