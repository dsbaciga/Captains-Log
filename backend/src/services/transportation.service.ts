import prisma from '../config/database';
import {
  CreateTransportationInput,
  UpdateTransportationInput,
} from '../types/transportation.types';
import { verifyTripAccess, verifyEntityAccess, verifyLocationInTrip } from '../utils/serviceHelpers';

class TransportationService {
  async createTransportation(userId: number, data: CreateTransportationInput) {
    // Verify user owns the trip
    await verifyTripAccess(userId, data.tripId);

    // Verify locations belong to trip if provided
    if (data.fromLocationId) {
      await verifyLocationInTrip(data.fromLocationId, data.tripId);
    }

    if (data.toLocationId) {
      await verifyLocationInTrip(data.toLocationId, data.tripId);
    }

    const transportation = await prisma.transportation.create({
      data: {
        tripId: data.tripId,
        type: data.type,
        startLocationId: data.fromLocationId || null,
        endLocationId: data.toLocationId || null,
        startLocationText: data.fromLocationName || null,
        endLocationText: data.toLocationName || null,
        scheduledStart: data.departureTime ? new Date(data.departureTime) : null,
        scheduledEnd: data.arrivalTime ? new Date(data.arrivalTime) : null,
        company: data.carrier || null,
        referenceNumber: data.vehicleNumber || null,
        bookingReference: data.confirmationNumber || null,
        cost: data.cost || null,
        currency: data.currency || null,
        notes: data.notes || null,
      },
      include: {
        startLocation: {
          select: {
            id: true,
            name: true,
          },
        },
        endLocation: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return transportation;
  }

  async getTransportationByTrip(userId: number, tripId: number) {
    // Verify user has access to trip
    await verifyTripAccess(userId, tripId);

    const transportations = await prisma.transportation.findMany({
      where: { tripId },
      include: {
        startLocation: {
          select: {
            id: true,
            name: true,
          },
        },
        endLocation: {
          select: {
            id: true,
            name: true,
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
      orderBy: [{ scheduledStart: 'asc' }, { createdAt: 'asc' }],
    });

    return transportations;
  }

  async getTransportationById(userId: number, transportationId: number) {
    const transportation = await prisma.transportation.findUnique({
      where: { id: transportationId },
      include: {
        trip: true,
        startLocation: true,
        endLocation: true,
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

    // Verify access
    await verifyEntityAccess(transportation, userId, 'Transportation');

    return transportation;
  }

  async updateTransportation(
    userId: number,
    transportationId: number,
    data: UpdateTransportationInput
  ) {
    const transportation = await prisma.transportation.findUnique({
      where: { id: transportationId },
      include: { trip: true },
    });

    // Verify access
    const verifiedTransportation = await verifyEntityAccess(transportation, userId, 'Transportation');

    // Verify locations belong to trip if provided
    if (data.fromLocationId !== undefined && data.fromLocationId !== null) {
      await verifyLocationInTrip(data.fromLocationId, verifiedTransportation.tripId);
    }

    if (data.toLocationId !== undefined && data.toLocationId !== null) {
      await verifyLocationInTrip(data.toLocationId, verifiedTransportation.tripId);
    }

    const updatedTransportation = await prisma.transportation.update({
      where: { id: transportationId },
      data: {
        type: data.type,
        startLocationId: data.fromLocationId !== undefined ? data.fromLocationId : undefined,
        endLocationId: data.toLocationId !== undefined ? data.toLocationId : undefined,
        startLocationText: data.fromLocationName !== undefined ? data.fromLocationName : undefined,
        endLocationText: data.toLocationName !== undefined ? data.toLocationName : undefined,
        scheduledStart:
          data.departureTime !== undefined
            ? data.departureTime
              ? new Date(data.departureTime)
              : null
            : undefined,
        scheduledEnd:
          data.arrivalTime !== undefined
            ? data.arrivalTime
              ? new Date(data.arrivalTime)
              : null
            : undefined,
        company: data.carrier !== undefined ? data.carrier : undefined,
        referenceNumber: data.vehicleNumber !== undefined ? data.vehicleNumber : undefined,
        bookingReference: data.confirmationNumber !== undefined ? data.confirmationNumber : undefined,
        cost: data.cost !== undefined ? data.cost : undefined,
        currency: data.currency !== undefined ? data.currency : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
      },
      include: {
        startLocation: {
          select: {
            id: true,
            name: true,
          },
        },
        endLocation: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updatedTransportation;
  }

  async deleteTransportation(userId: number, transportationId: number) {
    const transportation = await prisma.transportation.findUnique({
      where: { id: transportationId },
      include: { trip: true },
    });

    // Verify access
    await verifyEntityAccess(transportation, userId, 'Transportation');

    await prisma.transportation.delete({
      where: { id: transportationId },
    });

    return { success: true };
  }
}

export default new TransportationService();
