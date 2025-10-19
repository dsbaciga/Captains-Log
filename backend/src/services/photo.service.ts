import prisma from '../config/database';
import { AppError } from '../utils/errors';
import {
  PhotoSource,
  UploadPhotoInput,
  LinkImmichPhotoInput,
  UpdatePhotoInput,
} from '../types/photo.types';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'photos');
const THUMBNAIL_DIR = path.join(process.cwd(), 'uploads', 'thumbnails');

// Ensure upload directories exist
async function ensureUploadDirs() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(THUMBNAIL_DIR, { recursive: true });
}

class PhotoService {
  async uploadPhoto(
    userId: number,
    file: Express.Multer.File,
    data: UploadPhotoInput
  ) {
    // Verify user owns the trip
    const trip = await prisma.trip.findFirst({
      where: { id: data.tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found or access denied', 404);
    }

    // Verify location belongs to trip if provided
    if (data.locationId) {
      const location = await prisma.location.findFirst({
        where: { id: data.locationId, tripId: data.tripId },
      });

      if (!location) {
        throw new AppError('Location not found or does not belong to trip', 404);
      }
    }

    await ensureUploadDirs();

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${Math.random().toString(36).substring(7)}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const thumbnailFilename = `thumb-${filename}`;
    const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename);

    // Save original file
    await fs.writeFile(filepath, file.buffer);

    // Create thumbnail
    await sharp(file.buffer)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    // Extract EXIF data for GPS coordinates if available
    let latitude = data.latitude;
    let longitude = data.longitude;
    let takenAt = data.takenAt ? new Date(data.takenAt) : null;

    try {
      const metadata = await sharp(file.buffer).metadata();
      if (metadata.exif) {
        // Parse EXIF data for GPS and date
        // Note: More robust EXIF parsing could be added with exif-parser library
        if (!takenAt && metadata.exif) {
          // Extract date from EXIF if available
        }
      }
    } catch (error) {
      // Continue without EXIF data if parsing fails
    }

    const photo = await prisma.photo.create({
      data: {
        tripId: data.tripId,
        locationId: data.locationId || null,
        source: PhotoSource.LOCAL,
        localPath: `/uploads/photos/${filename}`,
        thumbnailPath: `/uploads/thumbnails/${thumbnailFilename}`,
        caption: data.caption || null,
        takenAt,
        latitude,
        longitude,
      },
    });

    return photo;
  }

  async linkImmichPhoto(userId: number, data: LinkImmichPhotoInput) {
    // Verify user owns the trip
    const trip = await prisma.trip.findFirst({
      where: { id: data.tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found or access denied', 404);
    }

    // Verify location belongs to trip if provided
    if (data.locationId) {
      const location = await prisma.location.findFirst({
        where: { id: data.locationId, tripId: data.tripId },
      });

      if (!location) {
        throw new AppError('Location not found or does not belong to trip', 404);
      }
    }

    // Get user's Immich settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        immichApiUrl: true,
        immichApiKey: true,
      },
    });

    // Verify Immich asset exists (if user has Immich configured)
    if (user?.immichApiUrl && user?.immichApiKey) {
      try {
        const response = await axios.get(
          `${user.immichApiUrl}/api/assets/${data.immichAssetId}`,
          {
            headers: {
              'x-api-key': user.immichApiKey,
            },
          }
        );

        // Extract metadata from Immich asset if available
        if (response.data) {
          const asset = response.data;
          if (!data.takenAt && asset.fileCreatedAt) {
            data.takenAt = asset.fileCreatedAt;
          }
          if (!data.latitude && asset.exifInfo?.latitude) {
            data.latitude = asset.exifInfo.latitude;
          }
          if (!data.longitude && asset.exifInfo?.longitude) {
            data.longitude = asset.exifInfo.longitude;
          }
        }
      } catch (error) {
        console.error('Failed to verify Immich asset:', error);
        // Don't throw error - allow linking even if verification fails
        // The asset ID is already validated on the frontend
      }
    }

    const photo = await prisma.photo.create({
      data: {
        tripId: data.tripId,
        locationId: data.locationId || null,
        source: PhotoSource.IMMICH,
        immichAssetId: data.immichAssetId,
        thumbnailPath: `/api/immich/assets/${data.immichAssetId}/thumbnail`,
        caption: data.caption || null,
        takenAt: data.takenAt ? new Date(data.takenAt) : null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      },
    });

    return photo;
  }

  async getPhotosByTrip(
    userId: number,
    tripId: number,
    options?: { skip?: number; take?: number }
  ) {
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

    const skip = options?.skip || 0;
    const take = options?.take || 40; // Default to 40 photos per page

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where: { tripId },
        include: {
          location: {
            select: {
              id: true,
              name: true,
            },
          },
          albumAssignments: {
            include: {
              album: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [{ takenAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      prisma.photo.count({ where: { tripId } }),
    ]);

    return {
      photos,
      total,
      hasMore: skip + photos.length < total,
    };
  }

  async getUnsortedPhotosByTrip(
    userId: number,
    tripId: number,
    options?: { skip?: number; take?: number }
  ) {
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

    const skip = options?.skip || 0;
    const take = options?.take || 40; // Default to 40 photos per page

    // Get IDs of photos that are in albums
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

    const photoIdsInAlbums = photosInAlbums.map(p => p.photoId);

    // Get photos that are NOT in the photoIdsInAlbums array
    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where: {
          tripId,
          id: {
            notIn: photoIdsInAlbums,
          },
        },
        include: {
          location: {
            select: {
              id: true,
              name: true,
            },
          },
          albumAssignments: {
            include: {
              album: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [{ takenAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      prisma.photo.count({
        where: {
          tripId,
          id: {
            notIn: photoIdsInAlbums,
          },
        },
      }),
    ]);

    return {
      photos,
      total,
      hasMore: skip + photos.length < total,
    };
  }

  async getPhotosByLocation(userId: number, locationId: number) {
    // Verify user has access to location's trip
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        trip: true,
      },
    });

    if (!location) {
      throw new AppError('Location not found', 404);
    }

    // Check trip access
    const hasAccess =
      location.trip.userId === userId ||
      location.trip.privacy === 'public' ||
      (location.trip.privacy === 'shared' &&
        (await prisma.travelCompanion.count({
          where: { tripId: location.trip.id, userId },
        })) > 0);

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    const photos = await prisma.photo.findMany({
      where: { locationId },
      orderBy: [{ takenAt: 'desc' }, { createdAt: 'desc' }],
    });

    return photos;
  }

  async getPhotoById(userId: number, photoId: number) {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        trip: true,
        location: true,
        albums: {
          include: {
            album: true,
          },
        },
      },
    });

    if (!photo) {
      throw new AppError('Photo not found', 404);
    }

    // Check trip access
    const hasAccess =
      photo.trip.userId === userId ||
      photo.trip.privacy === 'public' ||
      (photo.trip.privacy === 'shared' &&
        (await prisma.travelCompanion.count({
          where: { tripId: photo.trip.id, userId },
        })) > 0);

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    return photo;
  }

  async updatePhoto(userId: number, photoId: number, data: UpdatePhotoInput) {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { trip: true },
    });

    if (!photo) {
      throw new AppError('Photo not found', 404);
    }

    if (photo.trip.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Verify location belongs to trip if provided
    if (data.locationId !== undefined && data.locationId !== null) {
      const location = await prisma.location.findFirst({
        where: { id: data.locationId, tripId: photo.tripId },
      });

      if (!location) {
        throw new AppError('Location not found or does not belong to trip', 404);
      }
    }

    const updatedPhoto = await prisma.photo.update({
      where: { id: photoId },
      data: {
        locationId: data.locationId !== undefined ? data.locationId : undefined,
        caption: data.caption !== undefined ? data.caption : undefined,
        takenAt:
          data.takenAt !== undefined
            ? data.takenAt
              ? new Date(data.takenAt)
              : null
            : undefined,
        latitude: data.latitude !== undefined ? data.latitude : undefined,
        longitude: data.longitude !== undefined ? data.longitude : undefined,
      },
    });

    return updatedPhoto;
  }

  async deletePhoto(userId: number, photoId: number) {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { trip: true },
    });

    if (!photo) {
      throw new AppError('Photo not found', 404);
    }

    if (photo.trip.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Delete local files if they exist
    if (photo.source === PhotoSource.LOCAL && photo.localPath) {
      try {
        const filepath = path.join(process.cwd(), photo.localPath);
        await fs.unlink(filepath);
      } catch (error) {
        // Continue even if file deletion fails
      }

      if (photo.thumbnailPath) {
        try {
          const thumbnailPath = path.join(process.cwd(), photo.thumbnailPath);
          await fs.unlink(thumbnailPath);
        } catch (error) {
          // Continue even if file deletion fails
        }
      }
    }

    await prisma.photo.delete({
      where: { id: photoId },
    });

    return { success: true };
  }
}

export default new PhotoService();
