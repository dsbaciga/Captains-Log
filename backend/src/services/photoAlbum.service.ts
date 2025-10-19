import prisma from '../config/database';
import { AppError } from '../utils/errors';
import {
  CreateAlbumInput,
  UpdateAlbumInput,
  AddPhotosToAlbumInput,
} from '../types/photo.types';

class PhotoAlbumService {
  async createAlbum(userId: number, data: CreateAlbumInput) {
    // Verify user owns the trip
    const trip = await prisma.trip.findFirst({
      where: { id: data.tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found or access denied', 404);
    }

    // Verify location, activity, and lodging belong to the trip if provided
    if (data.locationId) {
      const location = await prisma.location.findFirst({
        where: { id: data.locationId, tripId: data.tripId },
      });
      if (!location) {
        throw new AppError('Location not found or does not belong to trip', 404);
      }
    }

    if (data.activityId) {
      const activity = await prisma.activity.findFirst({
        where: { id: data.activityId, tripId: data.tripId },
      });
      if (!activity) {
        throw new AppError('Activity not found or does not belong to trip', 404);
      }
    }

    if (data.lodgingId) {
      const lodging = await prisma.lodging.findFirst({
        where: { id: data.lodgingId, tripId: data.tripId },
      });
      if (!lodging) {
        throw new AppError('Lodging not found or does not belong to trip', 404);
      }
    }

    const album = await prisma.photoAlbum.create({
      data: {
        tripId: data.tripId,
        name: data.name,
        description: data.description || null,
        locationId: data.locationId || null,
        activityId: data.activityId || null,
        lodgingId: data.lodgingId || null,
      },
      include: {
        _count: {
          select: { photoAssignments: true },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        activity: {
          select: {
            id: true,
            name: true,
          },
        },
        lodging: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return album;
  }

  async getAlbumsByTrip(userId: number, tripId: number) {
    // Verify user has access to trip
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found or access denied', 404);
    }

    const albums = await prisma.photoAlbum.findMany({
      where: { tripId },
      include: {
        _count: {
          select: { photoAssignments: true },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        activity: {
          select: {
            id: true,
            name: true,
          },
        },
        lodging: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate unsorted photos count
    // Total photos in trip minus unique photos that are in any album
    const totalPhotosCount = await prisma.photo.count({
      where: { tripId },
    });

    // Get unique photo IDs that are in albums for this trip
    const photosInAlbums = await prisma.photoAlbumAssignment.findMany({
      where: {
        album: {
          tripId,
        },
      },
      select: {
        photoId: true,
      },
      distinct: ['photoId'],
    });

    const unsortedCount = totalPhotosCount - photosInAlbums.length;

    return {
      albums,
      unsortedCount,
      totalCount: totalPhotosCount,
    };
  }

  async getAlbumById(
    userId: number,
    albumId: number,
    options?: { skip?: number; take?: number }
  ) {
    const skip = options?.skip || 0;
    const take = options?.take || 40; // Default to 40 photos per page

    const album = await prisma.photoAlbum.findUnique({
      where: { id: albumId },
      include: {
        trip: true,
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        activity: {
          select: {
            id: true,
            name: true,
          },
        },
        lodging: {
          select: {
            id: true,
            name: true,
          },
        },
        photoAssignments: {
          include: {
            photo: {
              include: {
                location: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
          skip,
          take,
        },
        _count: {
          select: { photoAssignments: true },
        },
      },
    });

    if (!album) {
      throw new AppError('Album not found', 404);
    }

    // Check trip access
    if (album.trip.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    return {
      ...album,
      hasMore: skip + album.photoAssignments.length < album._count.photoAssignments,
      total: album._count.photoAssignments,
    };
  }

  async updateAlbum(userId: number, albumId: number, data: UpdateAlbumInput) {
    const album = await prisma.photoAlbum.findUnique({
      where: { id: albumId },
      include: { trip: true },
    });

    if (!album) {
      throw new AppError('Album not found', 404);
    }

    if (album.trip.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Verify location, activity, and lodging belong to the trip if provided
    if (data.locationId !== undefined && data.locationId !== null) {
      const location = await prisma.location.findFirst({
        where: { id: data.locationId, tripId: album.tripId },
      });
      if (!location) {
        throw new AppError('Location not found or does not belong to trip', 404);
      }
    }

    if (data.activityId !== undefined && data.activityId !== null) {
      const activity = await prisma.activity.findFirst({
        where: { id: data.activityId, tripId: album.tripId },
      });
      if (!activity) {
        throw new AppError('Activity not found or does not belong to trip', 404);
      }
    }

    if (data.lodgingId !== undefined && data.lodgingId !== null) {
      const lodging = await prisma.lodging.findFirst({
        where: { id: data.lodgingId, tripId: album.tripId },
      });
      if (!lodging) {
        throw new AppError('Lodging not found or does not belong to trip', 404);
      }
    }

    const updatedAlbum = await prisma.photoAlbum.update({
      where: { id: albumId },
      data: {
        name: data.name,
        description: data.description !== undefined ? data.description : undefined,
        locationId: data.locationId !== undefined ? data.locationId : undefined,
        activityId: data.activityId !== undefined ? data.activityId : undefined,
        lodgingId: data.lodgingId !== undefined ? data.lodgingId : undefined,
      },
      include: {
        _count: {
          select: { photoAssignments: true },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        activity: {
          select: {
            id: true,
            name: true,
          },
        },
        lodging: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updatedAlbum;
  }

  async deleteAlbum(userId: number, albumId: number) {
    const album = await prisma.photoAlbum.findUnique({
      where: { id: albumId },
      include: { trip: true },
    });

    if (!album) {
      throw new AppError('Album not found', 404);
    }

    if (album.trip.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    await prisma.photoAlbum.delete({
      where: { id: albumId },
    });

    return { success: true };
  }

  async addPhotosToAlbum(
    userId: number,
    albumId: number,
    data: AddPhotosToAlbumInput
  ) {
    const album = await prisma.photoAlbum.findUnique({
      where: { id: albumId },
      include: { trip: true },
    });

    if (!album) {
      throw new AppError('Album not found', 404);
    }

    if (album.trip.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Verify all photos belong to the same trip
    const photos = await prisma.photo.findMany({
      where: {
        id: { in: data.photoIds },
        tripId: album.tripId,
      },
    });

    if (photos.length !== data.photoIds.length) {
      throw new AppError(
        'One or more photos not found or do not belong to trip',
        400
      );
    }

    // Add photos to album (ignore duplicates)
    await prisma.photoAlbumAssignment.createMany({
      data: data.photoIds.map((photoId) => ({
        albumId,
        photoId,
      })),
      skipDuplicates: true,
    });

    return { success: true, addedCount: photos.length };
  }

  async removePhotoFromAlbum(
    userId: number,
    albumId: number,
    photoId: number
  ) {
    const album = await prisma.photoAlbum.findUnique({
      where: { id: albumId },
      include: { trip: true },
    });

    if (!album) {
      throw new AppError('Album not found', 404);
    }

    if (album.trip.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    await prisma.photoAlbumAssignment.delete({
      where: {
        albumId_photoId: {
          albumId,
          photoId,
        },
      },
    });

    return { success: true };
  }
}

export default new PhotoAlbumService();
