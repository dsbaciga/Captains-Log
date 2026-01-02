import prisma from '../config/database';
import {
  CreateLodgingInput,
  UpdateLodgingInput,
} from '../types/lodging.types';
import { verifyTripAccess, verifyEntityAccess, verifyLocationInTrip } from '../utils/serviceHelpers';
import { photoAlbumsInclude, journalAssignmentsInclude } from '../utils/prismaIncludes';

class LodgingService {
  async createLodging(userId: number, data: CreateLodgingInput) {
    // Verify user owns the trip
    await verifyTripAccess(userId, data.tripId);

    // Verify location belongs to trip if provided
    if (data.locationId) {
      await verifyLocationInTrip(data.locationId, data.tripId);
    }

    const lodging = await prisma.lodging.create({
      data: {
        tripId: data.tripId,
        type: data.type,
        name: data.name,
        locationId: data.locationId || null,
        address: data.address || null,
        checkInDate: data.checkInDate ? new Date(data.checkInDate) : new Date(),
        checkOutDate: data.checkOutDate ? new Date(data.checkOutDate) : new Date(),
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
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    return lodging;
  }

  async getLodgingByTrip(userId: number, tripId: number) {
    // Verify user has access to trip
    await verifyTripAccess(userId, tripId);

    const lodgings = await prisma.lodging.findMany({
      where: { tripId },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
        photoAlbums: photoAlbumsInclude,
        journalAssignments: journalAssignmentsInclude,
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
        photoAlbums: photoAlbumsInclude,
        journalAssignments: journalAssignmentsInclude,
      },
    });

    await verifyEntityAccess(lodging, userId, 'Lodging');

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

    await verifyEntityAccess(lodging, userId, 'Lodging');

    // Verify location belongs to trip if provided
    if (data.locationId !== undefined && data.locationId !== null) {
      await verifyLocationInTrip(data.locationId, lodging!.tripId);
    }

    const updatedLodging = await prisma.lodging.update({
      where: { id: lodgingId },
      data: {
        type: data.type,
        name: data.name,
        locationId: data.locationId !== undefined ? data.locationId : undefined,
        address: data.address !== undefined ? data.address : undefined,
        ...(data.checkInDate !== undefined && data.checkInDate !== null
          ? { checkInDate: new Date(data.checkInDate) }
          : {}),
        ...(data.checkOutDate !== undefined && data.checkOutDate !== null
          ? { checkOutDate: new Date(data.checkOutDate) }
          : {}),
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
            latitude: true,
            longitude: true,
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

    await verifyEntityAccess(lodging, userId, 'Lodging');

    await prisma.lodging.delete({
      where: { id: lodgingId },
    });

    return { success: true };
  }
}

export default new LodgingService();
