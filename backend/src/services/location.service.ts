import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CreateLocationInput, UpdateLocationInput, CreateLocationCategoryInput, UpdateLocationCategoryInput } from '../types/location.types';

export class LocationService {
  async createLocation(userId: number, data: CreateLocationInput) {
    // Verify user owns the trip
    const trip = await prisma.trip.findFirst({
      where: { id: data.tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found or you do not have permission', 404);
    }

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

    // Convert Decimal to number for latitude and longitude
    return {
      ...location,
      latitude: location.latitude ? Number(location.latitude) : null,
      longitude: location.longitude ? Number(location.longitude) : null,
    };
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

    // Convert Decimal to number for latitude and longitude
    return locations.map(location => ({
      ...location,
      latitude: location.latitude ? Number(location.latitude) : null,
      longitude: location.longitude ? Number(location.longitude) : null,
    }));
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

    // Convert Decimal to number for latitude and longitude
    return locations.map(location => ({
      ...location,
      latitude: location.latitude ? Number(location.latitude) : null,
      longitude: location.longitude ? Number(location.longitude) : null,
    }));
  }

  async getLocationById(userId: number, locationId: number) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        category: true,
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

    return location;
  }

  async updateLocation(userId: number, locationId: number, data: UpdateLocationInput) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        trip: true,
      },
    });

    if (!location) {
      throw new AppError('Location not found', 404);
    }

    if (location.trip.userId !== userId) {
      throw new AppError('You do not have permission to edit this location', 403);
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.visitDatetime !== undefined) updateData.visitDatetime = data.visitDatetime ? new Date(data.visitDatetime) : null;
    if (data.visitDurationMinutes !== undefined) updateData.visitDurationMinutes = data.visitDurationMinutes;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updatedLocation = await prisma.location.update({
      where: { id: locationId },
      data: updateData,
      include: {
        category: true,
      },
    });

    // Convert Decimal to number for latitude and longitude
    return {
      ...updatedLocation,
      latitude: updatedLocation.latitude ? Number(updatedLocation.latitude) : null,
      longitude: updatedLocation.longitude ? Number(updatedLocation.longitude) : null,
    };
  }

  async deleteLocation(userId: number, locationId: number) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        trip: true,
      },
    });

    if (!location) {
      throw new AppError('Location not found', 404);
    }

    if (location.trip.userId !== userId) {
      throw new AppError('You do not have permission to delete this location', 403);
    }

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
