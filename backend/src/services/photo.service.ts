import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import {
  PhotoSource,
  UploadPhotoInput,
  LinkImmichPhotoInput,
  LinkImmichPhotoBatchInput,
  UpdatePhotoInput,
  PhotoQueryOptions,
  PhotoSortBy,
  SortOrder,
} from '../types/photo.types';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';
import { verifyTripAccess, verifyEntityAccess, convertDecimals } from '../utils/serviceHelpers';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'photos');
const THUMBNAIL_DIR = path.join(process.cwd(), 'uploads', 'thumbnails');

// Ensure upload directories exist
async function ensureUploadDirs() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(THUMBNAIL_DIR, { recursive: true });
}

// Helper function to build orderBy clause based on sort options
function buildPhotoOrderBy(sortBy?: string, sortOrder?: string) {
  const order = sortOrder === SortOrder.ASC ? 'asc' : 'desc';

  switch (sortBy) {
    case PhotoSortBy.DATE:
      return [{ takenAt: order }, { createdAt: order }];
    case PhotoSortBy.CAPTION:
      return [{ caption: order }, { takenAt: order }];
    case PhotoSortBy.LOCATION:
      // For location, we need to order by the related location's name
      // This will require a different approach since it's a nested relation
      return [{ takenAt: order }, { createdAt: order }]; // Fallback to date for now
    case PhotoSortBy.CREATED:
      return [{ createdAt: order }];
    default:
      // Default: most recent photos first
      return [{ takenAt: 'desc' }, { createdAt: 'desc' }];
  }
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
        source: PhotoSource.LOCAL,
        localPath: `/uploads/photos/${filename}`,
        thumbnailPath: `/uploads/thumbnails/${thumbnailFilename}`,
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
        source: PhotoSource.IMMICH,
        immichAssetId: data.immichAssetId,
        thumbnailPath: `/api/immich/assets/${data.immichAssetId}/thumbnail`,
        caption: data.caption || null,
        takenAt: data.takenAt ? new Date(data.takenAt) : null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      },
    });

    return convertDecimals(photo);
  }

  async linkImmichPhotosBatch(userId: number, data: LinkImmichPhotoBatchInput) {
    // Verify user owns the trip
    await verifyTripAccess(userId, data.tripId);

    const BATCH_SIZE = 50;
    const results = {
      total: data.assets.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Get existing immichAssetIds for this trip to prevent duplicates
    const existingPhotos = await prisma.photo.findMany({
      where: {
        tripId: data.tripId,
        immichAssetId: {
          not: null,
        },
      },
      select: {
        immichAssetId: true,
      },
    });

    const existingAssetIds = new Set(
      existingPhotos.map((p: any) => p.immichAssetId).filter((id: any): id is string => id !== null)
    );

    console.log(`[PhotoService] Found ${existingAssetIds.size} existing Immich photos for trip ${data.tripId}`);

    // Filter out assets that are already linked to this trip
    const assetsToLink = data.assets.filter((asset) => !existingAssetIds.has(asset.immichAssetId));

    if (assetsToLink.length < data.assets.length) {
      const skippedCount = data.assets.length - assetsToLink.length;
      console.log(`[PhotoService] Skipping ${skippedCount} already-linked photos`);
      results.total = assetsToLink.length; // Update total to reflect actual photos to link
    }

    if (assetsToLink.length === 0) {
      console.log(`[PhotoService] No new photos to link - all ${data.assets.length} photos are already linked`);
      return results;
    }

    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < assetsToLink.length; i += BATCH_SIZE) {
      const batch = assetsToLink.slice(i, i + BATCH_SIZE);

      // Prepare batch data for insertion
      const photosToCreate = batch.map((asset) => ({
        tripId: data.tripId,
        source: PhotoSource.IMMICH,
        immichAssetId: asset.immichAssetId,
        thumbnailPath: `/api/immich/assets/${asset.immichAssetId}/thumbnail`,
        caption: asset.caption || null,
        takenAt: asset.takenAt ? new Date(asset.takenAt) : null,
        latitude: asset.latitude || null,
        longitude: asset.longitude || null,
      }));

      try {
        // Use createMany for efficient batch insertion
        const result = await prisma.photo.createMany({
          data: photosToCreate,
        });

        results.successful += result.count;
        console.log(`[PhotoService] Batch ${Math.floor(i / BATCH_SIZE) + 1}: Created ${result.count} photos`);
      } catch (error: any) {
        console.error(`[PhotoService] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
        results.failed += batch.length;
        results.errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      }
    }

    console.log(`[PhotoService] Batch linking complete: ${results.successful} successful, ${results.failed} failed`);
    return results;
  }

  async getPhotosByTrip(
    userId: number,
    tripId: number,
    options?: PhotoQueryOptions
  ) {
    // Verify user has access to trip
    await verifyTripAccess(userId, tripId);

    const skip = options?.skip || 0;
    const take = options?.take || 40; // Default to 40 photos per page
    const orderBy = buildPhotoOrderBy(options?.sortBy, options?.sortOrder);

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
        orderBy,
        skip,
        take,
      }),
      prisma.photo.count({ where: { tripId } }),
    ]);

    return {
      photos: photos.map((photo: any) => convertDecimals(photo)),
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

    return photos.map((p: any) => p.immichAssetId).filter((id: any): id is string => id !== null);
  }

  async getUnsortedPhotosByTrip(
    userId: number,
    tripId: number,
    options?: PhotoQueryOptions
  ) {
    // Verify user has access to trip
    await verifyTripAccess(userId, tripId);

    const skip = options?.skip || 0;
    const take = options?.take || 40; // Default to 40 photos per page
    const orderBy = buildPhotoOrderBy(options?.sortBy, options?.sortOrder);

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

    const photoIdsInAlbums = photosInAlbums.map((p: any) => p.photoId);

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
        orderBy,
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
      photos: photos.map((photo: any) => convertDecimals(photo)),
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

  /**
   * Get photo date groupings for a trip (dates and counts only, for lazy loading)
   * Groups photos by date in the specified timezone
   */
  async getPhotoDateGroupings(userId: number, tripId: number, timezone?: string) {
    await verifyTripAccess(userId, tripId);

    // Default to UTC if no timezone specified
    const tz = timezone || 'UTC';

    // Validate timezone format to prevent SQL injection
    // Valid timezones contain only alphanumeric, /, _, +, - characters
    if (!/^[a-zA-Z0-9/_+-]+$/.test(tz)) {
      throw new AppError('Invalid timezone format', 400);
    }

    // Use raw SQL for efficient date grouping with timezone conversion
    // Convert from UTC (stored) to the trip's timezone for grouping
    // Note: Using Prisma.raw for timezone since AT TIME ZONE requires a literal string
    // The timezone is already validated above, so it's safe to use Prisma.raw
    const groupings = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT
        TO_CHAR("taken_at" AT TIME ZONE 'UTC' AT TIME ZONE ${Prisma.raw(`'${tz}'`)}, 'YYYY-MM-DD') as date,
        COUNT(*) as count
      FROM photos
      WHERE trip_id = ${tripId} AND "taken_at" IS NOT NULL
      GROUP BY TO_CHAR("taken_at" AT TIME ZONE 'UTC' AT TIME ZONE ${Prisma.raw(`'${tz}'`)}, 'YYYY-MM-DD')
      ORDER BY date ASC
    `;

    // Get total count of photos with dates
    const totalWithDates = groupings.reduce((sum, g) => sum + Number(g.count), 0);

    // Get total count of all photos
    const totalAll = await prisma.photo.count({ where: { tripId } });

    return {
      groupings: groupings.map(g => ({
        date: g.date, // Already formatted as YYYY-MM-DD
        count: Number(g.count),
      })),
      totalWithDates,
      totalWithoutDates: totalAll - totalWithDates,
    };
  }

  /**
   * Get photos for a specific date (for lazy loading by day)
   * Uses timezone to determine the day boundaries
   */
  async getPhotosByDate(
    userId: number,
    tripId: number,
    date: string, // YYYY-MM-DD format
    timezone?: string
  ) {
    await verifyTripAccess(userId, tripId);

    // Default to UTC if no timezone specified
    const tz = timezone || 'UTC';

    // Validate timezone format to prevent SQL injection
    // Valid timezones contain only alphanumeric, /, _, +, - characters
    if (!/^[a-zA-Z0-9/_+-]+$/.test(tz)) {
      throw new AppError('Invalid timezone format', 400);
    }

    // Use raw SQL to query photos for the specific date in the given timezone
    // This ensures we get the same photos that were grouped under this date
    // Note: Using Prisma.raw for timezone since AT TIME ZONE requires a literal string
    // The timezone is already validated above, so it's safe to use Prisma.raw
    const photos = await prisma.$queryRaw<Array<any>>`
      SELECT p.*,
        json_agg(
          DISTINCT jsonb_build_object(
            'album', jsonb_build_object('id', a.id, 'name', a.name)
          )
        ) FILTER (WHERE a.id IS NOT NULL) as "albumAssignments"
      FROM photos p
      LEFT JOIN photo_album_assignments paa ON p.id = paa.photo_id
      LEFT JOIN photo_albums a ON paa.album_id = a.id
      WHERE p.trip_id = ${tripId}
        AND p."taken_at" IS NOT NULL
        AND TO_CHAR(p."taken_at" AT TIME ZONE 'UTC' AT TIME ZONE ${Prisma.raw(`'${tz}'`)}, 'YYYY-MM-DD') = ${date}
      GROUP BY p.id
      ORDER BY p."taken_at" ASC
    `;

    // Transform the raw results to match the expected format
    const transformedPhotos = photos.map((photo: any) => {
      const transformed = convertDecimals({
        id: photo.id,
        tripId: photo.trip_id,
        source: photo.source,
        immichAssetId: photo.immich_asset_id,
        localPath: photo.local_path,
        thumbnailPath: photo.thumbnail_path,
        caption: photo.caption,
        takenAt: photo.taken_at,
        latitude: photo.latitude,
        longitude: photo.longitude,
        createdAt: photo.created_at,
        updatedAt: photo.updated_at,
      });

      // Transform album assignments
      if (photo.albumAssignments && Array.isArray(photo.albumAssignments)) {
        transformed.albumAssignments = photo.albumAssignments.filter((a: any) => a.album?.id);
      } else {
        transformed.albumAssignments = [];
      }

      return transformed;
    });

    return {
      photos: transformedPhotos,
      date,
      count: transformedPhotos.length,
    };
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

    // Clean up entity links before deleting
    await prisma.entityLink.deleteMany({
      where: {
        tripId: verifiedPhoto.tripId,
        OR: [
          { sourceType: 'PHOTO', sourceId: photoId },
          { targetType: 'PHOTO', targetId: photoId },
        ],
      },
    });

    await prisma.photo.delete({
      where: { id: photoId },
    });

    return { success: true };
  }
}

export default new PhotoService();
