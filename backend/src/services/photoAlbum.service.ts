import prisma from '../config/database';
import { AppError } from '../utils/errors';
import {
  CreateAlbumInput,
  UpdateAlbumInput,
  AddPhotosToAlbumInput,
} from '../types/photo.types';
import { verifyTripAccess, verifyEntityAccess } from '../utils/serviceHelpers';

class PhotoAlbumService {
  /**
   * Get all albums across all trips for a user with pagination
   */
  async getAllAlbums(
    userId: number,
    options?: { skip?: number; take?: number }
  ) {
    const skip = options?.skip ?? 0;
    const take = options?.take ?? 30;

    const where = {
      trip: {
        userId: userId,
        ...(options?.tagIds && options.tagIds.length > 0
          ? {
              tagAssignments: {
                some: {
                  tagId: {
                    in: options.tagIds,
                  },
                },
              },
            }
          : {}),
      },
    };

    const [albums, totalAlbums] = await Promise.all([
      prisma.photoAlbum.findMany({
        where,
        include: {
          trip: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              tagAssignments: {
                select: {
                  tag: {
                    select: {
                      id: true,
                      name: true,
                      color: true,
                      textColor: true,
                    },
                  },
                },
              },
            },
          },
          coverPhoto: true,
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
        orderBy: [
          { trip: { startDate: 'desc' } },
          { createdAt: 'desc' },
        ],
        skip,
        take,
      }),
      prisma.photoAlbum.count({ where }),
    ]);

    // Calculate total stats
    const totalPhotos = await prisma.photoAlbumAssignment.count({
      where: {
        album: where,
      },
    });

    // Group albums by trip (for tripCount)
    const tripIds = [...new Set(albums.map((a) => a.trip.id))];

    const loadedCount = skip + albums.length;
    const hasMore = loadedCount < totalAlbums;

    return {
      albums,
      totalAlbums,
      totalPhotos,
      tripCount: tripIds.length,
      hasMore,
    };
  }

  async createAlbum(userId: number, data: CreateAlbumInput) {
    // Verify user owns the trip
    await verifyTripAccess(userId, data.tripId);

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
    await verifyTripAccess(userId, tripId);

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
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        },
        _count: {
          select: { photoAssignments: true },
        },
      },
    });

    // Verify access
    const verifiedAlbum = await verifyEntityAccess(album, userId, 'Album');

    const loadedCount = skip + verifiedAlbum.photoAssignments.length;
    const totalCount = verifiedAlbum._count.photoAssignments;

    console.log('[PhotoAlbumService] getAlbumById pagination:', {
      albumId,
      skip,
      take,
      returnedPhotos: verifiedAlbum.photoAssignments.length,
      loadedCount,
      totalCount,
      hasMore: loadedCount < totalCount,
    });

    return {
      ...verifiedAlbum,
      hasMore: loadedCount < totalCount,
      total: totalCount,
    };
  }

  async updateAlbum(userId: number, albumId: number, data: UpdateAlbumInput) {
    const album = await prisma.photoAlbum.findUnique({
      where: { id: albumId },
      include: { trip: true },
    });

    // Verify access
    const verifiedAlbum = await verifyEntityAccess(album, userId, 'Album');

    // Verify location, activity, and lodging belong to the trip if provided
    if (data.locationId !== undefined && data.locationId !== null) {
      const location = await prisma.location.findFirst({
        where: { id: data.locationId, tripId: verifiedAlbum.tripId },
      });
      if (!location) {
        throw new AppError('Location not found or does not belong to trip', 404);
      }
    }

    if (data.activityId !== undefined && data.activityId !== null) {
      const activity = await prisma.activity.findFirst({
        where: { id: data.activityId, tripId: verifiedAlbum.tripId },
      });
      if (!activity) {
        throw new AppError('Activity not found or does not belong to trip', 404);
      }
    }

    if (data.lodgingId !== undefined && data.lodgingId !== null) {
      const lodging = await prisma.lodging.findFirst({
        where: { id: data.lodgingId, tripId: verifiedAlbum.tripId },
      });
      if (!lodging) {
        throw new AppError('Lodging not found or does not belong to trip', 404);
      }
    }

    // Validate cover photo belongs to the same trip if provided
    if (data.coverPhotoId !== undefined && data.coverPhotoId !== null) {
      const coverPhoto = await prisma.photo.findFirst({
        where: {
          id: data.coverPhotoId,
          tripId: verifiedAlbum.tripId,
        },
      });

      if (!coverPhoto) {
        throw new AppError('Cover photo not found or does not belong to trip', 404);
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
        coverPhotoId:
          data.coverPhotoId !== undefined ? data.coverPhotoId : undefined,
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
        coverPhoto: true,
      },
    });

    return updatedAlbum;
  }

  async deleteAlbum(userId: number, albumId: number) {
    const album = await prisma.photoAlbum.findUnique({
      where: { id: albumId },
      include: { trip: true },
    });

    // Verify access
    await verifyEntityAccess(album, userId, 'Album');

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

    // Verify access
    const verifiedAlbum = await verifyEntityAccess(album, userId, 'Album');

    // Verify all photos belong to the same trip
    const photos = await prisma.photo.findMany({
      where: {
        id: { in: data.photoIds },
        tripId: verifiedAlbum.tripId,
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

    // Verify access
    await verifyEntityAccess(album, userId, 'Album');

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
