import prisma from '../config/database';
import { AppError } from '../utils/errors';
import {
  PhotoSource,
  MediaType,
  UploadPhotoInput,
  LinkImmichPhotoInput,
  UpdatePhotoInput,
} from '../types/photo.types';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import { verifyTripAccess, verifyEntityAccess, convertDecimals } from '../utils/serviceHelpers';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'photos');
const THUMBNAIL_DIR = path.join(process.cwd(), 'uploads', 'thumbnails');

// Ensure upload directories exist
async function ensureUploadDirs() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(THUMBNAIL_DIR, { recursive: true });
}

// Generate thumbnail for video
async function generateVideoThumbnail(
  videoPath: string,
  thumbnailPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: path.basename(thumbnailPath),
        folder: path.dirname(thumbnailPath),
        size: '400x?',
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err));
  });
}

// Get video duration
async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const duration = metadata.format.duration || 0;
        resolve(Math.round(duration));
      }
    });
  });
}

class PhotoService {
  async uploadPhoto(
    userId: number,
    file: Express.Multer.File,
    data: UploadPhotoInput
  ) {
    // Verify user owns the trip
    await verifyTripAccess(userId, data.tripId);

    await ensureUploadDirs();

    // Determine if file is video or photo
    const isVideo = file.mimetype.startsWith('video/');
    const mediaType = isVideo ? MediaType.VIDEO : MediaType.PHOTO;

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${Math.random().toString(36).substring(7)}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const thumbnailFilename = `thumb-${filename.replace(ext, '.jpg')}`;
    const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename);

    // Save original file
    await fs.writeFile(filepath, file.buffer);

    let duration: number | null = null;

    // Generate thumbnail based on media type
    if (isVideo) {
      // Generate video thumbnail and extract duration
      try {
        await generateVideoThumbnail(filepath, thumbnailPath);
        duration = await getVideoDuration(filepath);
      } catch (error) {
        console.error('Failed to process video:', error);
        // Clean up the uploaded file if video processing fails
        await fs.unlink(filepath).catch(() => {});
        throw new AppError('Failed to process video file', 500);
      }
    } else {
      // Create image thumbnail
      await sharp(file.buffer)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
    }

    // Extract EXIF data for GPS coordinates if available (photos only)
    let latitude = data.latitude;
    let longitude = data.longitude;
    let takenAt = data.takenAt ? new Date(data.takenAt) : null;

    if (!isVideo) {
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
    }

    const photo = await prisma.photo.create({
      data: {
        tripId: data.tripId,
        source: PhotoSource.LOCAL,
        mediaType,
        localPath: `/uploads/photos/${filename}`,
        thumbnailPath: `/uploads/thumbnails/${thumbnailFilename}`,
        duration,
        caption: data.caption || null,
        takenAt,
        latitude,
        longitude,
      },
    });

    return convertDecimals(photo);
  }

  async linkImmichPhoto(userId: number, data: LinkImmichPhotoInput) {
    // Verify user owns the trip
    await verifyTripAccess(userId, data.tripId);

    // Get user's Immich settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        immichApiUrl: true,
        immichApiKey: true,
      },
    });

    let mediaType = MediaType.PHOTO;
    let duration: number | null = null;

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

          // Determine media type from Immich asset type
          if (asset.type === 'VIDEO') {
            mediaType = MediaType.VIDEO;
            // Extract duration from Immich metadata if available
            if (asset.exifInfo?.fileSizeInByte && asset.duration) {
              duration = Math.round(asset.duration);
            }
          }

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
        source: PhotoSource.IMMICH,
        mediaType,
        immichAssetId: data.immichAssetId,
        thumbnailPath: `/api/immich/assets/${data.immichAssetId}/thumbnail`,
        duration,
        caption: data.caption || null,
        takenAt: data.takenAt ? new Date(data.takenAt) : null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      },
    });

    return convertDecimals(photo);
  }

  async getPhotosByTrip(
    userId: number,
    tripId: number,
    options?: { skip?: number; take?: number }
  ) {
    // Verify user has access to trip
    await verifyTripAccess(userId, tripId);

    const skip = options?.skip || 0;
    const take = options?.take || 40; // Default to 40 photos per page

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where: { tripId },
        include: {
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
      photos: photos.map((photo) => convertDecimals(photo)),
      total,
      hasMore: skip + photos.length < total,
    };
  }

  async getImmichAssetIdsByTrip(userId: number, tripId: number): Promise<string[]> {
    // Verify user has access to trip
    await verifyTripAccess(userId, tripId);

    // Get all Immich asset IDs for photos in this trip
    const photos = await prisma.photo.findMany({
      where: {
        tripId,
        immichAssetId: {
          not: null,
        },
      },
      select: {
        immichAssetId: true,
      },
    });

    return photos.map((p) => p.immichAssetId).filter((id): id is string => id !== null);
  }

  async getUnsortedPhotosByTrip(
    userId: number,
    tripId: number,
    options?: { skip?: number; take?: number }
  ) {
    // Verify user has access to trip
    await verifyTripAccess(userId, tripId);

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
      photos: photos.map((photo) => convertDecimals(photo)),
      total,
      hasMore: skip + photos.length < total,
    };
  }

  async getPhotoById(userId: number, photoId: number) {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        trip: true,
        albumAssignments: {
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
      photo.trip.privacyLevel === 'Public' ||
      (photo.trip.privacyLevel === 'Shared' &&
        (await prisma.tripCollaborator.count({
          where: { tripId: photo.trip.id, userId },
        })) > 0);

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    return convertDecimals(photo);
  }

  async updatePhoto(userId: number, photoId: number, data: UpdatePhotoInput) {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { trip: true },
    });

    // Verify access
    await verifyEntityAccess(photo, userId, 'Photo');

    const updatedPhoto = await prisma.photo.update({
      where: { id: photoId },
      data: {
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

    return convertDecimals(updatedPhoto);
  }

  async deletePhoto(userId: number, photoId: number) {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { trip: true },
    });

    // Verify access
    const verifiedPhoto = await verifyEntityAccess(photo, userId, 'Photo');

    // Delete local files if they exist
    if (verifiedPhoto.source === PhotoSource.LOCAL && verifiedPhoto.localPath) {
      try {
        const filepath = path.join(process.cwd(), verifiedPhoto.localPath);
        await fs.unlink(filepath);
      } catch (error) {
        // Continue even if file deletion fails
      }

      if (verifiedPhoto.thumbnailPath) {
        try {
          const thumbnailPath = path.join(process.cwd(), verifiedPhoto.thumbnailPath);
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
