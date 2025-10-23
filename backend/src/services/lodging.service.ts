import prisma from '../config/database';
import { AppError } from '../utils/errors';
import {
  CreateLodgingInput,
  UpdateLodgingInput,
} from '../types/lodging.types';

class LodgingService {
  async createLodging(userId: number, data: CreateLodgingInput) {
    // Verify user owns the trip
    const trip = await prisma.trip.findFirst({
      where: { id: data.tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found or access denied', 404);
    }

    // Verify location belongs to trip if provided
    if (data.locationId) {
      const location = await prisma.location.findFirst({
        where: { id: data.locationId, tripId: data.tripId },
      });

      if (!location) {
        throw new AppError('Location not found or does not belong to trip', 404);
      }
    }

    const lodging = await prisma.lodging.create({
      data: {
        tripId: data.tripId,
        type: data.type,
        name: data.name,
        locationId: data.locationId || null,
        address: data.address || null,
        checkInDate: data.checkInDate ? new Date(data.checkInDate) : null,
        checkOutDate: data.checkOutDate ? new Date(data.checkOutDate) : null,
        confirmationNumber: data.confirmationNumber || null,
        cost: data.cost || null,
        currency: data.currency || null,
        bookingUrl: data.bookingUrl || null,
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
      },
    });

    return lodging;
  }

  async getLodgingByTrip(userId: number, tripId: number) {
    // Verify user has access to trip
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        userId,
      },
    });

    if (!trip) {
      throw new AppError('Trip not found or access denied', 404);
    }

    const lodgings = await prisma.lodging.findMany({
      where: { tripId },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
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
      orderBy: [{ checkInDate: 'asc' }, { createdAt: 'asc' }],
    });

    return lodgings;
  }

  async getLodgingById(userId: number, lodgingId: number) {
    const lodging = await prisma.lodging.findUnique({
      where: { id: lodgingId },
      include: {
        trip: true,
        location: true,
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

    if (!lodging) {
      throw new AppError('Lodging not found', 404);
    }

    // Check trip access
    if (lodging.trip.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    return lodging;
  }

  async updateLodging(
    userId: number,
    lodgingId: number,
    data: UpdateLodgingInput
  ) {
    const lodging = await prisma.lodging.findUnique({
      where: { id: lodgingId },
      include: { trip: true },
    });

    if (!lodging) {
      throw new AppError('Lodging not found', 404);
    }

    if (lodging.trip.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Verify location belongs to trip if provided
    if (data.locationId !== undefined && data.locationId !== null) {
      const location = await prisma.location.findFirst({
        where: { id: data.locationId, tripId: lodging.tripId },
      });

      if (!location) {
        throw new AppError('Location not found or does not belong to trip', 404);
      }
    }

    const updatedLodging = await prisma.lodging.update({
      where: { id: lodgingId },
      data: {
        type: data.type,
        name: data.name,
        locationId: data.locationId !== undefined ? data.locationId : undefined,
        address: data.address !== undefined ? data.address : undefined,
        checkInDate:
          data.checkInDate !== undefined
            ? data.checkInDate
              ? new Date(data.checkInDate)
              : null
            : undefined,
        checkOutDate:
          data.checkOutDate !== undefined
            ? data.checkOutDate
              ? new Date(data.checkOutDate)
              : null
            : undefined,
        confirmationNumber: data.confirmationNumber !== undefined ? data.confirmationNumber : undefined,
        cost: data.cost !== undefined ? data.cost : undefined,
        currency: data.currency !== undefined ? data.currency : undefined,
        bookingUrl: data.bookingUrl !== undefined ? data.bookingUrl : undefined,
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
      },
    });

    return updatedLodging;
  }

  async deleteLodging(userId: number, lodgingId: number) {
    const lodging = await prisma.lodging.findUnique({
      where: { id: lodgingId },
      include: { trip: true },
    });

    if (!lodging) {
      throw new AppError('Lodging not found', 404);
    }

    if (lodging.trip.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    await prisma.lodging.delete({
      where: { id: lodgingId },
    });

    return { success: true };
  }
}

export default new LodgingService();
