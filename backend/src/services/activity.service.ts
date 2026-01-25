import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { CreateActivityInput, UpdateActivityInput, BulkDeleteActivitiesInput, BulkUpdateActivitiesInput } from '../types/activity.types';
import {
  verifyTripAccess,
  verifyEntityAccess,
  verifyEntityInTrip,
  convertDecimals,
  buildConditionalUpdateData,
  cleanupEntityLinks,
} from '../utils/serviceHelpers';

// Note: Location association is handled via EntityLink system, not direct FK

class ActivityService {
  async createActivity(userId: number, data: CreateActivityInput) {
    // Verify user owns the trip
    await verifyTripAccess(userId, data.tripId);

    // Verify parent activity exists and belongs to same trip if provided
    if (data.parentId) {
      await verifyEntityInTrip('activity', data.parentId, data.tripId);
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
          },
          orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
        },
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
          },
          orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
        },
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

    const verifiedActivity = await verifyEntityAccess(activity, userId, 'Activity');

    // Verify parent activity exists and belongs to same trip if provided
    if (data.parentId) {
      // Prevent circular reference - activity cannot be its own parent
      if (data.parentId === activityId) {
        throw new AppError('Activity cannot be its own parent', 400);
      }
      await verifyEntityInTrip('activity', data.parentId, verifiedActivity.tripId);
    }

    // Note: Location association is handled via EntityLink system, not direct FK
    const updateData = buildConditionalUpdateData(data, {
      transformers: {
        startTime: (val) => (val ? new Date(val) : null),
        endTime: (val) => (val ? new Date(val) : null),
      },
    });

    const updatedActivity = await prisma.activity.update({
      where: { id: activityId },
      data: updateData,
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
    await cleanupEntityLinks(verifiedActivity.tripId, 'ACTIVITY', activityId);

    await prisma.activity.delete({
      where: { id: activityId },
    });

    return { success: true };
  }

  /**
   * Bulk delete multiple activities
   * Verifies ownership for all activities before deletion
   */
  async bulkDeleteActivities(userId: number, tripId: number, data: BulkDeleteActivitiesInput) {
    // Verify user owns the trip
    await verifyTripAccess(userId, tripId);

    // Verify all activities belong to this trip and user has access
    const activities = await prisma.activity.findMany({
      where: {
        id: { in: data.ids },
        tripId,
      },
      include: { trip: true },
    });

    if (activities.length !== data.ids.length) {
      throw new AppError('One or more activities not found or do not belong to this trip', 404);
    }

    // Clean up entity links for all activities
    for (const activity of activities) {
      await cleanupEntityLinks(activity.tripId, 'ACTIVITY', activity.id);
    }

    // Delete all activities
    const result = await prisma.activity.deleteMany({
      where: {
        id: { in: data.ids },
        tripId,
      },
    });

    return { success: true, deletedCount: result.count };
  }

  /**
   * Bulk update multiple activities
   * Verifies ownership for all activities before update
   */
  async bulkUpdateActivities(userId: number, tripId: number, data: BulkUpdateActivitiesInput) {
    // Verify user owns the trip
    await verifyTripAccess(userId, tripId);

    // Verify all activities belong to this trip
    const activities = await prisma.activity.findMany({
      where: {
        id: { in: data.ids },
        tripId,
      },
    });

    if (activities.length !== data.ids.length) {
      throw new AppError('One or more activities not found or do not belong to this trip', 404);
    }

    // Build update data from non-undefined values
    const updateData: Record<string, unknown> = {};
    if (data.updates.category !== undefined) updateData.category = data.updates.category;
    if (data.updates.notes !== undefined) updateData.notes = data.updates.notes;
    if (data.updates.timezone !== undefined) updateData.timezone = data.updates.timezone;

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No valid update fields provided', 400);
    }

    // Update all activities
    const result = await prisma.activity.updateMany({
      where: {
        id: { in: data.ids },
        tripId,
      },
      data: updateData,
    });

    return { success: true, updatedCount: result.count };
  }
}

export default new ActivityService();
