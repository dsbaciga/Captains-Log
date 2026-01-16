import prisma from '../config/database';
import {
  CreateTransportationInput,
  UpdateTransportationInput,
} from '../types/transportation.types';
import { verifyTripAccess, verifyEntityAccess, verifyLocationInTrip, convertDecimals } from '../utils/serviceHelpers';
import { journalAssignmentsInclude, locationWithAddressSelect } from '../utils/prismaIncludes';
import routingService from './routing.service';

// Helper to map database fields to frontend field names
const mapTransportationToFrontend = (t: any): Record<string, any> => {
  const converted = convertDecimals(t);
  return {
    id: converted.id,
    tripId: converted.tripId,
    type: converted.type,
    fromLocationId: converted.startLocationId,
    toLocationId: converted.endLocationId,
    fromLocationName: converted.startLocationText,
    toLocationName: converted.endLocationText,
    departureTime: converted.scheduledStart,
    arrivalTime: converted.scheduledEnd,
    startTimezone: converted.startTimezone,
    endTimezone: converted.endTimezone,
    carrier: converted.company,
    vehicleNumber: converted.referenceNumber,
    confirmationNumber: converted.bookingReference,
    cost: converted.cost,
    currency: converted.currency,
    notes: converted.notes,
    connectionGroupId: converted.connectionGroupId,
    calculatedDistance: converted.calculatedDistance,
    calculatedDuration: converted.calculatedDuration,
    distanceSource: converted.distanceSource,
    createdAt: converted.createdAt,
    updatedAt: converted.updatedAt,
    fromLocation: converted.startLocation ? {
      id: converted.startLocation.id,
      name: converted.startLocation.name,
      address: converted.startLocation.address,
      latitude: converted.startLocation.latitude,
      longitude: converted.startLocation.longitude,
    } : null,
    toLocation: converted.endLocation ? {
      id: converted.endLocation.id,
      name: converted.endLocation.name,
      address: converted.endLocation.address,
      latitude: converted.endLocation.latitude,
      longitude: converted.endLocation.longitude,
    } : null,
    journalAssignments: converted.journalAssignments,
    flightTracking: converted.flightTracking,
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
          select: locationWithAddressSelect,
        },
        endLocation: {
          select: locationWithAddressSelect,
        },
        journalAssignments: journalAssignmentsInclude,
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
          select: locationWithAddressSelect,
        },
        endLocation: {
          select: locationWithAddressSelect,
        },
        journalAssignments: journalAssignmentsInclude,
        flightTracking: true,
      },
      orderBy: [{ scheduledStart: 'asc' }, { createdAt: 'asc' }],
    });

    return await this.enhanceTransportations(transportations);
  }

  async getAllTransportation(userId: number) {
    // Get all trips user has access to
    const trips = await prisma.trip.findMany({
      where: { userId },
      select: { id: true },
    });

    const tripIds = trips.map((t: any) => t.id);

    // Get all transportation for user's trips
    const transportations = await prisma.transportation.findMany({
      where: { tripId: { in: tripIds } },
      include: {
        startLocation: {
          select: locationWithAddressSelect,
        },
        endLocation: {
          select: locationWithAddressSelect,
        },
        journalAssignments: journalAssignmentsInclude,
        flightTracking: true,
      },
      orderBy: [{ scheduledStart: 'asc' }, { createdAt: 'asc' }],
    });

    return await this.enhanceTransportations(transportations);
  }

  private async enhanceTransportations(transportations: any[]) {
    // Enhance with computed fields and map to frontend format
    const now = new Date();
    const enhancedTransportations = await Promise.all(transportations.map(async (t) => {
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

        // Try to get route geometry for road-based transportation
        // Always attempt for car/bike/walk types, even if distance was calculated with Haversine
        // The routing service will use cache if available and handle fallbacks gracefully
        if (t.type === 'car' || t.type === 'bicycle' || t.type === 'bike' || t.type === 'walk' || t.type === 'walking') {
          try {
            // Determine routing profile based on transportation type
            let profile: 'driving-car' | 'cycling-regular' | 'foot-walking' = 'driving-car';
            if (t.type === 'bicycle' || t.type === 'bike') {
              profile = 'cycling-regular';
            } else if (t.type === 'walk' || t.type === 'walking') {
              profile = 'foot-walking';
            }

            const route = await routingService.calculateRoute(
              {
                latitude: Number(t.startLocation.latitude),
                longitude: Number(t.startLocation.longitude),
              },
              {
                latitude: Number(t.endLocation.latitude),
                longitude: Number(t.endLocation.longitude),
              },
              profile
            );

            if (route.geometry) {
              mapped.route.geometry = route.geometry;
            }
          } catch (error) {
            console.error('Failed to fetch route geometry:', error);
          }
        }
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
    }));

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
          select: locationWithAddressSelect,
        },
        endLocation: {
          select: locationWithAddressSelect,
        },
        journalAssignments: journalAssignmentsInclude,
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
    const verifiedTransportation = await verifyEntityAccess(transportation, userId, 'Transportation');

    // Clean up entity links before deleting
    await prisma.entityLink.deleteMany({
      where: {
        tripId: verifiedTransportation.tripId,
        OR: [
          { sourceType: 'TRANSPORTATION', sourceId: transportationId },
          { targetType: 'TRANSPORTATION', targetId: transportationId },
        ],
      },
    });

    await prisma.transportation.delete({
      where: { id: transportationId },
    });

    return { success: true };
  }
}

export default new TransportationService();
