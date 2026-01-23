import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CreateLocationInput, UpdateLocationInput, CreateLocationCategoryInput, UpdateLocationCategoryInput } from '../types/location.types';
import { verifyTripAccess, verifyEntityAccess, buildConditionalUpdateData, convertDecimals } from '../utils/serviceHelpers';

export class LocationService {
  async createLocation(userId: number, data: CreateLocationInput) {
    // Verify user owns the trip
    await verifyTripAccess(userId, data.tripId);

    // If parentId is provided, verify it exists and belongs to the same trip
    if (data.parentId) {
      const parent = await prisma.location.findFirst({
        where: {
          id: data.parentId,
          tripId: data.tripId,
        },
      });

      if (!parent) {
        throw new AppError('Parent location not found or does not belong to the same trip', 404);
      }
    }

    const location = await prisma.location.create({
      data: {
        tripId: data.tripId,
        parentId: data.parentId,
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        categoryId: data.categoryId,
        visitDatetime: data.visitDatetime ? new Date(data.visitDatetime) : null,
        visitDurationMinutes: data.visitDurationMinutes,
        notes: data.notes,
      },
      include: {
        category: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return convertDecimals(location);
  }

  async getLocationsByTrip(userId: number, tripId: number) {
    // Verify user has access to the trip
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
    });

    if (!trip) {
      throw new AppError('Trip not found or you do not have access', 404);
    }

    const locations = await prisma.location.findMany({
      where: { tripId },
      include: {
        category: true,
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
            latitude: true,
            longitude: true,
            visitDatetime: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return convertDecimals(locations);
  }

  async getAllVisitedLocations(userId: number) {
    // Get all locations from user's trips that have coordinates
    const locations = await prisma.location.findMany({
      where: {
        trip: {
          userId,
          addToPlacesVisited: true,
        },
        AND: [
          { latitude: { not: null } },
          { longitude: { not: null } },
        ],
      },
      include: {
        category: true,
        trip: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: { visitDatetime: 'desc' },
    });

    return convertDecimals(locations);
  }

  async getLocationById(userId: number, locationId: number) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        category: true,
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
            latitude: true,
            longitude: true,
            visitDatetime: true,
            category: true,
          },
        },
        trip: {
          select: {
            userId: true,
            privacyLevel: true,
          },
        },
      },
    });

    if (!location) {
      throw new AppError('Location not found', 404);
    }

    // Check permissions
    if (
      location.trip.userId !== userId &&
      location.trip.privacyLevel !== 'Public'
    ) {
      throw new AppError('You do not have permission to view this location', 403);
    }

    return convertDecimals(location);
  }

  async updateLocation(userId: number, locationId: number, data: UpdateLocationInput) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        trip: true,
      },
    });

    // Verify access
    const verifiedLocation = await verifyEntityAccess(location, userId, 'Location');

    // If updating parentId, verify it exists and belongs to the same trip
    if (data.parentId !== undefined && data.parentId !== null) {
      // Prevent self-referencing
      if (data.parentId === locationId) {
        throw new AppError('A location cannot be its own parent', 400);
      }

      const parent = await prisma.location.findFirst({
        where: {
          id: data.parentId,
          tripId: verifiedLocation.tripId,
        },
      });

      if (!parent) {
        throw new AppError('Parent location not found or does not belong to the same trip', 404);
      }

      // Prevent circular references (check if new parent is a child of this location)
      const descendants = await this.getDescendants(locationId);
      if (descendants.some(d => d.id === data.parentId)) {
        throw new AppError('Cannot set parent to a descendant location (would create circular reference)', 400);
      }
    }

    const updateData = buildConditionalUpdateData(data, {
      transformers: {
        visitDatetime: (val) => val ? new Date(val) : null,
      },
    });

    const updatedLocation = await prisma.location.update({
      where: { id: locationId },
      data: updateData,
      include: {
        category: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return convertDecimals(updatedLocation);
  }

  // Helper method to get all descendants of a location using recursive CTE
  // This is O(1) queries instead of O(n) for the recursive approach
  private async getDescendants(locationId: number): Promise<{ id: number }[]> {
    const descendants = await prisma.$queryRaw<{ id: number }[]>`
      WITH RECURSIVE descendants AS (
        -- Base case: direct children of the location
        SELECT id FROM "locations" WHERE "parentId" = ${locationId}
        UNION ALL
        -- Recursive case: children of descendants
        SELECT l.id FROM "locations" l
        INNER JOIN descendants d ON l."parentId" = d.id
      )
      SELECT id FROM descendants
    `;

    return descendants;
  }

  async deleteLocation(userId: number, locationId: number) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        trip: true,
      },
    });

    // Verify access
    const verifiedLocation = await verifyEntityAccess(location, userId, 'Location');

    // Clean up entity links before deleting
    await prisma.entityLink.deleteMany({
      where: {
        tripId: verifiedLocation.tripId,
        OR: [
          { sourceType: 'LOCATION', sourceId: locationId },
          { targetType: 'LOCATION', targetId: locationId },
        ],
      },
    });

    await prisma.location.delete({
      where: { id: locationId },
    });

    return { message: 'Location deleted successfully' };
  }

  // Location Categories
  async getCategories(userId: number) {
    const categories = await prisma.locationCategory.findMany({
      where: {
        OR: [
          { userId },
          { isDefault: true },
        ],
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    return categories;
  }

  async createCategory(userId: number, data: CreateLocationCategoryInput) {
    const category = await prisma.locationCategory.create({
      data: {
        userId,
        name: data.name,
        icon: data.icon,
        color: data.color,
        isDefault: false,
      },
    });

    return category;
  }

  async updateCategory(userId: number, categoryId: number, data: UpdateLocationCategoryInput) {
    const category = await prisma.locationCategory.findFirst({
      where: {
        id: categoryId,
        userId,
        isDefault: false, // Can't edit default categories
      },
    });

    if (!category) {
      throw new AppError('Category not found or cannot be edited', 404);
    }

    const updated = await prisma.locationCategory.update({
      where: { id: categoryId },
      data: {
        name: data.name,
        icon: data.icon,
        color: data.color,
      },
    });

    return updated;
  }

  async deleteCategory(userId: number, categoryId: number) {
    const category = await prisma.locationCategory.findFirst({
      where: {
        id: categoryId,
        userId,
        isDefault: false,
      },
    });

    if (!category) {
      throw new AppError('Category not found or cannot be deleted', 404);
    }

    await prisma.locationCategory.delete({
      where: { id: categoryId },
    });

    return { message: 'Category deleted successfully' };
  }
}

export default new LocationService();
