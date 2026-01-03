import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CreateLocationInput, UpdateLocationInput, CreateLocationCategoryInput, UpdateLocationCategoryInput } from '../types/location.types';
import { verifyTripAccess, verifyEntityAccess, buildConditionalUpdateData, convertDecimals } from '../utils/serviceHelpers';
import { photoAlbumsInclude } from '../utils/prismaIncludes';

export class LocationService {
  async createLocation(userId: number, data: CreateLocationInput) {
    // Verify user owns the trip
    await verifyTripAccess(userId, data.tripId);

    const location = await prisma.location.create({
      data: {
        tripId: data.tripId,
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
        photoAlbums: photoAlbumsInclude,
        journalLocationAssignments: {
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
        photoAlbums: photoAlbumsInclude,
        journalLocationAssignments: {
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
    await verifyEntityAccess(location, userId, 'Location');

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
      },
    });

    return convertDecimals(updatedLocation);
  }

  async deleteLocation(userId: number, locationId: number) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        trip: true,
      },
    });

    // Verify access
    await verifyEntityAccess(location, userId, 'Location');

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
