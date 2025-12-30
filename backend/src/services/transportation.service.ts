import prisma from '../config/database';
import {
  CreateTransportationInput,
  UpdateTransportationInput,
} from '../types/transportation.types';
import { verifyTripAccess, verifyEntityAccess, verifyLocationInTrip } from '../utils/serviceHelpers';
import routingService from './routing.service';

// Helper to map database fields to frontend field names
const mapTransportationToFrontend = (t: any): Record<string, any> => {
  return {
    id: t.id,
    tripId: t.tripId,
    type: t.type,
    fromLocationId: t.startLocationId,
    toLocationId: t.endLocationId,
    fromLocationName: t.startLocationText,
    toLocationName: t.endLocationText,
    departureTime: t.scheduledStart,
    arrivalTime: t.scheduledEnd,
    startTimezone: t.startTimezone,
    endTimezone: t.endTimezone,
    carrier: t.company,
    vehicleNumber: t.referenceNumber,
    confirmationNumber: t.bookingReference,
    cost: t.cost ? Number(t.cost) : null,
    currency: t.currency,
    notes: t.notes,
    connectionGroupId: t.connectionGroupId,
    calculatedDistance: t.calculatedDistance ? Number(t.calculatedDistance) : null,
    calculatedDuration: t.calculatedDuration ? Number(t.calculatedDuration) : null,
    distanceSource: t.distanceSource,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    fromLocation: t.startLocation ? {
      id: t.startLocation.id,
      name: t.startLocation.name,
      latitude: t.startLocation.latitude ? Number(t.startLocation.latitude) : null,
      longitude: t.startLocation.longitude ? Number(t.startLocation.longitude) : null,
    } : null,
    toLocation: t.endLocation ? {
      id: t.endLocation.id,
      name: t.endLocation.name,
      latitude: t.endLocation.latitude ? Number(t.endLocation.latitude) : null,
      longitude: t.endLocation.longitude ? Number(t.endLocation.longitude) : null,
    } : null,
    journalAssignments: t.journalAssignments,
    flightTracking: t.flightTracking,
  };
};

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
        startTimezone: data.startTimezone || null,
        endTimezone: data.endTimezone || null,
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
            latitude: true,
            longitude: true,
          },
        },
        endLocation: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
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
        flightTracking: true,
      },
    });

    // Calculate route distance asynchronously (don't block the response)
    this.calculateAndStoreRouteDistance(transportation.id).catch(err =>
      console.error('Background route calculation failed:', err)
    );

    return mapTransportationToFrontend(transportation);
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
            latitude: true,
            longitude: true,
          },
        },
        endLocation: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
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
        flightTracking: true,
      },
      orderBy: [{ scheduledStart: 'asc' }, { createdAt: 'asc' }],
    });

    // Enhance with computed fields and map to frontend format
    const now = new Date();
    const enhancedTransportations = transportations.map((t) => {
      const mapped = mapTransportationToFrontend(t);

      // Calculate route if we have coordinates
      if (
        t.startLocation?.latitude &&
        t.startLocation?.longitude &&
        t.endLocation?.latitude &&
        t.endLocation?.longitude
      ) {
        mapped.route = {
          from: {
            name: t.startLocation.name,
            latitude: Number(t.startLocation.latitude),
            longitude: Number(t.startLocation.longitude),
          },
          to: {
            name: t.endLocation.name,
            latitude: Number(t.endLocation.latitude),
            longitude: Number(t.endLocation.longitude),
          },
        };
      }

      // Calculate duration
      if (t.scheduledStart && t.scheduledEnd) {
        const start = new Date(t.scheduledStart);
        const end = new Date(t.scheduledEnd);
        mapped.durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }

      // Calculate status flags
      if (t.scheduledStart) {
        const departureTime = new Date(t.scheduledStart);
        mapped.isUpcoming = departureTime > now;

        if (t.scheduledEnd) {
          const arrivalTime = new Date(t.scheduledEnd);
          mapped.isInProgress = departureTime <= now && arrivalTime > now;
        } else {
          mapped.isInProgress = false;
        }
      }

      return mapped;
    });

    return enhancedTransportations;
  }

  async getTransportationById(userId: number, transportationId: number) {
    const transportation = await prisma.transportation.findUnique({
      where: { id: transportationId },
      include: {
        trip: true,
        startLocation: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
          },
        },
        endLocation: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
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
        flightTracking: true,
      },
    });

    // Verify access
    await verifyEntityAccess(transportation, userId, 'Transportation');

    return mapTransportationToFrontend(transportation);
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
        startTimezone: data.startTimezone !== undefined ? data.startTimezone : undefined,
        endTimezone: data.endTimezone !== undefined ? data.endTimezone : undefined,
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
            latitude: true,
            longitude: true,
          },
        },
        endLocation: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
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
        flightTracking: true,
      },
    });

    // Recalculate route distance if locations changed
    if (
      data.fromLocationId !== undefined ||
      data.toLocationId !== undefined
    ) {
      this.calculateAndStoreRouteDistance(transportationId).catch(err =>
        console.error('Background route calculation failed:', err)
      );
    }

    return mapTransportationToFrontend(updatedTransportation);
  }

  /**
   * Calculate route distance and duration for a transportation
   * Updates the database with the calculated values
   */
  private async calculateAndStoreRouteDistance(
    transportationId: number
  ): Promise<void> {
    // Get the transportation with location data
    const transportation = await prisma.transportation.findUnique({
      where: { id: transportationId },
      include: {
        startLocation: {
          select: {
            latitude: true,
            longitude: true,
          },
        },
        endLocation: {
          select: {
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    if (!transportation) {
      return;
    }

    // Only calculate if we have both locations with coordinates
    if (
      !transportation.startLocation?.latitude ||
      !transportation.startLocation?.longitude ||
      !transportation.endLocation?.latitude ||
      !transportation.endLocation?.longitude
    ) {
      return;
    }

    const from = {
      latitude: Number(transportation.startLocation.latitude),
      longitude: Number(transportation.startLocation.longitude),
    };

    const to = {
      latitude: Number(transportation.endLocation.latitude),
      longitude: Number(transportation.endLocation.longitude),
    };

    // Determine routing profile based on transportation type
    let profile: 'driving-car' | 'cycling-regular' | 'foot-walking' = 'driving-car';
    if (transportation.type === 'bicycle' || transportation.type === 'bike') {
      profile = 'cycling-regular';
    } else if (transportation.type === 'walk' || transportation.type === 'walking') {
      profile = 'foot-walking';
    }

    try {
      // Calculate route (will fallback to Haversine if API unavailable)
      const route = await routingService.calculateRoute(from, to, profile);

      // Update the transportation with calculated values
      await prisma.transportation.update({
        where: { id: transportationId },
        data: {
          calculatedDistance: route.distance,
          calculatedDuration: route.duration,
          distanceSource: route.source,
        },
      });

      console.log(
        `[Transportation Service] Calculated ${route.source} distance for transportation ${transportationId}: ${route.distance.toFixed(2)} km`
      );
    } catch (error) {
      console.error('[Transportation Service] Failed to calculate route distance:', error);
      // Don't throw - route calculation failure shouldn't break the request
    }
  }

  /**
   * Recalculate distances for all transportation in a trip
   */
  async recalculateDistancesForTrip(userId: number, tripId: number): Promise<number> {
    // Verify user has access to trip
    await verifyTripAccess(userId, tripId);

    const transportations = await prisma.transportation.findMany({
      where: { tripId },
      select: { id: true },
    });

    let count = 0;
    for (const t of transportations) {
      await this.calculateAndStoreRouteDistance(t.id);
      count++;
    }

    return count;
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
