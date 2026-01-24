import prisma from '../config/database';
import {
  CreateLodgingInput,
  UpdateLodgingInput,
} from '../types/lodging.types';
import { verifyTripAccess, verifyEntityAccess, convertDecimals, buildConditionalUpdateData, cleanupEntityLinks } from '../utils/serviceHelpers';

// Note: Location association is handled via EntityLink system, not direct FK

class LodgingService {
  async createLodging(userId: number, data: CreateLodgingInput) {
    // Verify user owns the trip
    await verifyTripAccess(userId, data.tripId);

    // Note: Location association is handled via EntityLink system after creation
    const lodging = await prisma.lodging.create({
      data: {
        tripId: data.tripId,
        type: data.type,
        name: data.name,
        address: data.address || null,
        checkInDate: data.checkInDate ? new Date(data.checkInDate) : new Date(),
        checkOutDate: data.checkOutDate ? new Date(data.checkOutDate) : new Date(),
        timezone: data.timezone || null,
        confirmationNumber: data.confirmationNumber || null,
        cost: data.cost || null,
        currency: data.currency || null,
        bookingUrl: data.bookingUrl || null,
        notes: data.notes || null,
      },
    });

    return convertDecimals(lodging);
  }

  async getLodgingByTrip(userId: number, tripId: number) {
    // Verify user has access to trip
    await verifyTripAccess(userId, tripId);

    // Note: Location association is fetched via EntityLink system, not direct FK
    const lodgings = await prisma.lodging.findMany({
      where: { tripId },
      orderBy: [{ checkInDate: 'asc' }, { createdAt: 'asc' }],
    });

    return convertDecimals(lodgings);
  }

  async getLodgingById(userId: number, lodgingId: number) {
    // Note: Location association is fetched via EntityLink system, not direct FK
    const lodging = await prisma.lodging.findUnique({
      where: { id: lodgingId },
      include: {
        trip: true,
      },
    });

    await verifyEntityAccess(lodging, userId, 'Lodging');

    return convertDecimals(lodging);
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

    // Transformer for date fields: convert to Date if truthy, skip update if null/undefined.
    // This preserves existing dates if not explicitly provided (dates are required for lodging).
    // Note: This differs from activity.service.ts which returns null to allow clearing times.
    const dateTransformer = (val: string | null | undefined) =>
      val ? new Date(val) : undefined;

    // Note: Location association is handled via EntityLink system, not direct FK
    const updateData = buildConditionalUpdateData(data, {
      transformers: {
        checkInDate: dateTransformer,
        checkOutDate: dateTransformer,
      },
    });

    const updatedLodging = await prisma.lodging.update({
      where: { id: lodgingId },
      data: updateData,
    });

    return convertDecimals(updatedLodging);
  }

  async deleteLodging(userId: number, lodgingId: number) {
    const lodging = await prisma.lodging.findUnique({
      where: { id: lodgingId },
      include: { trip: true },
    });

    const verifiedLodging = await verifyEntityAccess(lodging, userId, 'Lodging');

    // Clean up entity links before deleting
    await cleanupEntityLinks(verifiedLodging.tripId, 'LODGING', lodgingId);

    await prisma.lodging.delete({
      where: { id: lodgingId },
    });

    return { success: true };
  }
}

export default new LodgingService();
