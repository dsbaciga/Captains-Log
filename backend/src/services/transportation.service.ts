import prisma from '../config/database';
import { AppError } from '../utils/errors';
import {
  CreateTransportationInput,
  UpdateTransportationInput,
} from '../types/transportation.types';

class TransportationService {
  async createTransportation(userId: number, data: CreateTransportationInput) {
    // Verify user owns the trip
    const trip = await prisma.trip.findFirst({
      where: { id: data.tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found or access denied', 404);
    }

    // Verify locations belong to trip if provided
    if (data.fromLocationId) {
      const location = await prisma.location.findFirst({
        where: { id: data.fromLocationId, tripId: data.tripId },
      });

      if (!location) {
        throw new AppError('From location not found or does not belong to trip', 404);
      }
    }

    if (data.toLocationId) {
      const location = await prisma.location.findFirst({
        where: { id: data.toLocationId, tripId: data.tripId },
      });

      if (!location) {
        throw new AppError('To location not found or does not belong to trip', 404);
      }
    }

    const transportation = await prisma.transportation.create({
      data: {
        tripId: data.tripId,
        type: data.type,
        fromLocationId: data.fromLocationId || null,
        toLocationId: data.toLocationId || null,
        fromLocationName: data.fromLocationName || null,
        toLocationName: data.toLocationName || null,
        departureTime: data.departureTime ? new Date(data.departureTime) : null,
        arrivalTime: data.arrivalTime ? new Date(data.arrivalTime) : null,
        carrier: data.carrier || null,
        vehicleNumber: data.vehicleNumber || null,
        confirmationNumber: data.confirmationNumber || null,
        cost: data.cost || null,
        currency: data.currency || null,
        notes: data.notes || null,
      },
      include: {
        fromLocation: {
          select: {
            id: true,
            name: true,
          },
        },
        toLocation: {
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
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        userId,
      },
    });

    if (!trip) {
      throw new AppError('Trip not found or access denied', 404);
    }

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
        fromLocation: true,
        toLocation: true,
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

    if (!transportation) {
      throw new AppError('Transportation not found', 404);
    }

    // Check trip access
    if (transportation.trip.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

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

    if (!transportation) {
      throw new AppError('Transportation not found', 404);
    }

    if (transportation.trip.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Verify locations belong to trip if provided
    if (data.fromLocationId !== undefined && data.fromLocationId !== null) {
      const location = await prisma.location.findFirst({
        where: { id: data.fromLocationId, tripId: transportation.tripId },
      });

      if (!location) {
        throw new AppError('From location not found or does not belong to trip', 404);
      }
    }

    if (data.toLocationId !== undefined && data.toLocationId !== null) {
      const location = await prisma.location.findFirst({
        where: { id: data.toLocationId, tripId: transportation.tripId },
      });

      if (!location) {
        throw new AppError('To location not found or does not belong to trip', 404);
      }
    }

    const updatedTransportation = await prisma.transportation.update({
      where: { id: transportationId },
      data: {
        type: data.type,
        fromLocationId: data.fromLocationId !== undefined ? data.fromLocationId : undefined,
        toLocationId: data.toLocationId !== undefined ? data.toLocationId : undefined,
        fromLocationName: data.fromLocationName !== undefined ? data.fromLocationName : undefined,
        toLocationName: data.toLocationName !== undefined ? data.toLocationName : undefined,
        departureTime:
          data.departureTime !== undefined
            ? data.departureTime
              ? new Date(data.departureTime)
              : null
            : undefined,
        arrivalTime:
          data.arrivalTime !== undefined
            ? data.arrivalTime
              ? new Date(data.arrivalTime)
              : null
            : undefined,
        carrier: data.carrier !== undefined ? data.carrier : undefined,
        vehicleNumber: data.vehicleNumber !== undefined ? data.vehicleNumber : undefined,
        confirmationNumber: data.confirmationNumber !== undefined ? data.confirmationNumber : undefined,
        cost: data.cost !== undefined ? data.cost : undefined,
        currency: data.currency !== undefined ? data.currency : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
      },
      include: {
        fromLocation: {
          select: {
            id: true,
            name: true,
          },
        },
        toLocation: {
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

    if (!transportation) {
      throw new AppError('Transportation not found', 404);
    }

    if (transportation.trip.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    await prisma.transportation.delete({
      where: { id: transportationId },
    });

    return { success: true };
  }
}

export default new TransportationService();
