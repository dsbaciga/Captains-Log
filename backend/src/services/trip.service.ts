import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CreateTripInput, UpdateTripInput, GetTripQuery, TripStatus } from '../types/trip.types';

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

    return trip;
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
