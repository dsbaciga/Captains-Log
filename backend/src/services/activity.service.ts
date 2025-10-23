import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { CreateActivityInput, UpdateActivityInput } from '../types/activity.types';
import { verifyTripAccess, verifyEntityAccess, verifyLocationInTrip } from '../utils/serviceHelpers';

class ActivityService {
  async createActivity(userId: number, data: CreateActivityInput) {
    // Verify user owns the trip
    await verifyTripAccess(userId, data.tripId);

    // Verify location belongs to trip if provided
    if (data.locationId) {
      await verifyLocationInTrip(data.locationId, data.tripId);
    }

    // Verify parent activity exists and belongs to same trip if provided
    if (data.parentId) {
      const parentActivity = await prisma.activity.findFirst({
        where: { id: data.parentId, tripId: data.tripId },
      });

      if (!parentActivity) {
        throw new AppError('Parent activity not found or does not belong to trip', 404);
      }
    }

    const activity = await prisma.activity.create({
      data: {
        tripId: data.tripId,
        locationId: data.locationId || null,
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
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return activity;
  }

  async getActivitiesByTrip(userId: number, tripId: number) {
    // Verify user has access to trip
    await verifyTripAccess(userId, tripId);

    const activities = await prisma.activity.findMany({
      where: { tripId },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
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
            startTime: true,
            endTime: true,
            category: true,
          },
          orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
        },
        photoAlbums: {
          select: {
            id: true,
            name: true,
            description: true,
            _count: {
              select: { photoAssignments: true },
            },
          },
        },
        journalAssignments: {
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
      },
      orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
    });

    return activities;
  }

  async getActivityById(userId: number, activityId: number) {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        trip: true,
        location: {
          select: {
            id: true,
            name: true,
          },
        },
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
            startTime: true,
            endTime: true,
            category: true,
          },
          orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
        },
        photoAlbums: {
          select: {
            id: true,
            name: true,
            description: true,
            _count: {
              select: { photoAssignments: true },
            },
          },
        },
        journalAssignments: {
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
      },
    });

    await verifyEntityAccess(activity, userId, 'Activity');

    return activity;
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

    // Verify location belongs to trip if provided
    if (data.locationId) {
      await verifyLocationInTrip(data.locationId, activity!.tripId);
    }

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

    const updatedActivity = await prisma.activity.update({
      where: { id: activityId },
      data: {
        locationId: data.locationId !== undefined ? data.locationId : undefined,
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
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updatedActivity;
  }

  async deleteActivity(userId: number, activityId: number) {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { trip: true },
    });

    await verifyEntityAccess(activity, userId, 'Activity');

    await prisma.activity.delete({
      where: { id: activityId },
    });

    return { success: true };
  }
}

export default new ActivityService();
