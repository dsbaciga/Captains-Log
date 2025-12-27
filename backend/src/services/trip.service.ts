import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CreateTripInput, UpdateTripInput, GetTripQuery, TripStatus } from '../types/trip.types';
import { companionService } from './companion.service';

export class TripService {
  async createTrip(userId: number, data: CreateTripInput) {
    // Auto-set addToPlacesVisited if status is Completed
    const addToPlacesVisited = data.status === TripStatus.COMPLETED
      ? true
      : data.addToPlacesVisited || false;

    // Get user's timezone if trip timezone not specified
    let timezone = data.timezone;
    if (!timezone) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { timezone: true },
      });
      timezone = user?.timezone || 'UTC';
    }

    const trip = await prisma.trip.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate + 'T00:00:00.000Z') : null,
        endDate: data.endDate ? new Date(data.endDate + 'T00:00:00.000Z') : null,
        timezone,
        status: data.status,
        privacyLevel: data.privacyLevel,
        addToPlacesVisited,
      },
    });

    // Auto-add "Myself" companion to new trips
    const myselfCompanion = await companionService.getMyselfCompanion(userId);
    if (myselfCompanion) {
      await prisma.tripCompanion.create({
        data: {
          tripId: trip.id,
          companionId: myselfCompanion.id,
        },
      });
    }

    return trip;
  }

  async getTrips(userId: number, query: GetTripQuery) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '10');
    const skip = (page - 1) * limit;

    const where: any = { userId };

    // Filter by status
    if (query.status) {
      where.status = query.status;
    }

    // Search in title and description
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Auto-update trip statuses before fetching
    await this.autoUpdateAllTripStatuses(userId);

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          coverPhoto: true,
          tagAssignments: {
            include: {
              tag: true,
            },
          },
        },
      }),
      prisma.trip.count({ where }),
    ]);

    return {
      trips,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Auto-update status for all user's trips that have dates
   * Does not update trips that are Completed or Cancelled
   */
  async autoUpdateAllTripStatuses(userId: number) {
    const trips = await prisma.trip.findMany({
      where: {
        userId,
        startDate: { not: null },
        endDate: { not: null },
        status: {
          notIn: [TripStatus.COMPLETED, TripStatus.CANCELLED],
        },
      },
      select: {
        id: true,
        userId: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updates = trips
      .map((trip) => {
        if (!trip.startDate || !trip.endDate) return null;

        const startDate = new Date(trip.startDate);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(trip.endDate);
        endDate.setHours(0, 0, 0, 0);

        let newStatus: string | null = null;

        // If today is after end date, mark as Completed
        if (today > endDate && trip.status !== TripStatus.COMPLETED) {
          newStatus = TripStatus.COMPLETED;
        }
        // If today is within trip dates (inclusive), mark as In Progress
        else if (today >= startDate && today <= endDate && trip.status !== TripStatus.IN_PROGRESS) {
          newStatus = TripStatus.IN_PROGRESS;
        }

        if (newStatus) {
          return prisma.trip.update({
            where: { id: trip.id },
            data: {
              status: newStatus,
              addToPlacesVisited: newStatus === TripStatus.COMPLETED ? true : undefined,
            },
          });
        }

        return null;
      })
      .filter((update) => update !== null);

    if (updates.length > 0) {
      await Promise.all(updates);
    }
  }

  async getTripById(userId: number, tripId: number) {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        OR: [
          { userId },
          {
            collaborators: {
              some: { userId },
            },
          },
          { privacyLevel: 'Public' },
        ],
      },
      include: {
        coverPhoto: true,
        bannerPhoto: true,
        tagAssignments: {
          include: {
            tag: true,
          },
        },
        companionAssignments: {
          include: {
            companion: true,
          },
        },
      },
    });

    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    // Auto-update status based on dates
    await this.autoUpdateTripStatus(trip.id, trip.userId);

    // Fetch updated trip
    const updatedTrip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        coverPhoto: true,
        bannerPhoto: true,
        tagAssignments: {
          include: {
            tag: true,
          },
        },
        companionAssignments: {
          include: {
            companion: true,
          },
        },
      },
    });

    return updatedTrip || trip;
  }

  /**
   * Automatically update trip status based on start and end dates
   * - If today >= startDate and today <= endDate, set to "In Progress"
   * - If today > endDate, set to "Completed"
   * - Only updates if trip has both startDate and endDate
   * - Does not override manually set Completed or Cancelled status
   */
  async autoUpdateTripStatus(tripId: number, ownerId: number) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        userId: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!trip || trip.userId !== ownerId) {
      return; // Trip not found or not owned by user
    }

    // Don't auto-update Completed or Cancelled trips
    if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
      return;
    }

    // Need both dates to auto-update
    if (!trip.startDate || !trip.endDate) {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const startDate = new Date(trip.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(trip.endDate);
    endDate.setHours(0, 0, 0, 0);

    let newStatus: string | null = null;

    // If today is after end date, mark as Completed
    if (today > endDate) {
      if (trip.status !== TripStatus.COMPLETED) {
        newStatus = TripStatus.COMPLETED;
      }
    }
    // If today is within trip dates (inclusive), mark as In Progress
    else if (today >= startDate && today <= endDate) {
      if (trip.status !== TripStatus.IN_PROGRESS) {
        newStatus = TripStatus.IN_PROGRESS;
      }
    }

    // Update if status changed
    if (newStatus) {
      await prisma.trip.update({
        where: { id: tripId },
        data: {
          status: newStatus,
          addToPlacesVisited: newStatus === TripStatus.COMPLETED ? true : undefined,
        },
      });
    }
  }

  async updateTrip(userId: number, tripId: number, data: UpdateTripInput) {
    // Verify ownership
    const existingTrip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!existingTrip) {
      throw new AppError('Trip not found or you do not have permission to edit it', 404);
    }

    // Auto-set addToPlacesVisited if status changed to Completed
    let addToPlacesVisited = data.addToPlacesVisited;
    if (data.status === TripStatus.COMPLETED && addToPlacesVisited === undefined) {
      addToPlacesVisited = true;
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate + 'T00:00:00.000Z') : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate + 'T00:00:00.000Z') : null;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.privacyLevel !== undefined) updateData.privacyLevel = data.privacyLevel;
    if (addToPlacesVisited !== undefined) updateData.addToPlacesVisited = addToPlacesVisited;

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: updateData,
    });

    return trip;
  }

  async deleteTrip(userId: number, tripId: number) {
    // Verify ownership
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found or you do not have permission to delete it', 404);
    }

    await prisma.trip.delete({
      where: { id: tripId },
    });

    return { message: 'Trip deleted successfully' };
  }

  async updateCoverPhoto(userId: number, tripId: number, photoId: number | null) {
    // Verify ownership
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found or you do not have permission to edit it', 404);
    }

    // If photoId is provided, verify the photo belongs to this trip
    if (photoId) {
      const photo = await prisma.photo.findFirst({
        where: { id: photoId, tripId },
      });

      if (!photo) {
        throw new AppError('Photo not found or does not belong to this trip', 404);
      }
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: { coverPhotoId: photoId },
      include: {
        coverPhoto: true,
      },
    });

    return updatedTrip;
  }
}

export default new TripService();
