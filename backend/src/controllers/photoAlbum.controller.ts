import { Request, Response, NextFunction } from 'express';
import photoAlbumService from '../services/photoAlbum.service';
import {
  createAlbumSchema,
  updateAlbumSchema,
  addPhotosToAlbumSchema,
  PhotoWithOptionalAlbums,
  TransformedPhoto,
  PhotoSortByType,
  SortOrderType,
} from '../types/photo.types';
import { AppError } from '../utils/errors';

// Type for album with optional cover photo
interface AlbumWithCoverPhoto {
  id: number;
  tripId: number;
  name: string;
  description?: string | null;
  coverPhoto?: PhotoWithOptionalAlbums | null;
  _count?: { photoAssignments: number };
  [key: string]: unknown;
}

// Helper function to add Immich URLs for photos and transform album assignments
function transformPhoto(photo: PhotoWithOptionalAlbums): TransformedPhoto {
  const transformed: TransformedPhoto = { ...photo };

  // Transform Immich paths
  if (photo.source === 'immich' && photo.immichAssetId) {
    transformed.thumbnailPath = `/api/immich/assets/${photo.immichAssetId}/thumbnail`;
    transformed.localPath = `/api/immich/assets/${photo.immichAssetId}/original`;
  }

  // Transform albumAssignments to albums for frontend compatibility
  if (photo.albumAssignments) {
    transformed.albums = photo.albumAssignments.map((assignment) => ({
      album: assignment.album,
    }));
    delete (transformed as { albumAssignments?: unknown }).albumAssignments;
  }

  return transformed;
}

class PhotoAlbumController {
  async getAllAlbums(req: Request, res: Response, next: NextFunction) {
    try {
      const skip = req.query.skip ? parseInt(req.query.skip as string) : undefined;
      const take = req.query.take ? parseInt(req.query.take as string) : undefined;

      const tagIds =
        typeof req.query.tagIds === 'string'
          ? req.query.tagIds
              .split(',')
              .map((id) => parseInt(id))
              .filter((id) => !isNaN(id))
          : undefined;

      const result = await photoAlbumService.getAllAlbums(req.user!.userId, {
        skip,
        take,
        tagIds,
      });

      // Transform cover photos for Immich compatibility
      const transformedAlbums = result.albums.map((album: AlbumWithCoverPhoto) => {
        if (album.coverPhoto) {
          return {
            ...album,
            coverPhoto: transformPhoto(album.coverPhoto),
          };
        }
        return album;
      });

      res.json({
        ...result,
        albums: transformedAlbums,
      });
    } catch (error) {
      next(error);
    }
  }

  async createAlbum(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createAlbumSchema.parse(req.body);
      const album = await photoAlbumService.createAlbum(
        req.user!.userId,
        validatedData
      );

      res.status(201).json(album);
    } catch (error) {
      next(error);
    }
  }

  async getAlbumsByTrip(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.user.userId) {
        throw new AppError('Unauthorized', 401);
      }

      const tripId = parseInt(req.params.tripId);
      if (isNaN(tripId)) {
        throw new AppError('Invalid trip ID', 400);
      }

      const skip = req.query.skip ? parseInt(req.query.skip as string) : undefined;
      const take = req.query.take ? parseInt(req.query.take as string) : undefined;

      if (process.env.NODE_ENV === 'development') {
        console.log('[PhotoAlbumController] getAlbumsByTrip called:', {
          userId: req.user.userId,
          tripId,
          skip,
          take,
        });
      }

      const result = await photoAlbumService.getAlbumsByTrip(
        req.user.userId,
        tripId,
        { skip, take }
      );

      // Transform cover photos for Immich compatibility
      const transformedAlbums = result.albums.map((album: AlbumWithCoverPhoto) => {
        if (album.coverPhoto) {
          return {
            ...album,
            coverPhoto: transformPhoto(album.coverPhoto),
          };
        }
        return album;
      });

      res.json({
        ...result,
        albums: transformedAlbums,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[PhotoAlbumController] getAlbumsByTrip error:', error);
      }
      next(error);
    }
  }

  async getAlbumById(req: Request, res: Response, next: NextFunction) {
    try {
      const albumId = parseInt(req.params.id);
      const skip = req.query.skip ? parseInt(req.query.skip as string) : undefined;
      const take = req.query.take ? parseInt(req.query.take as string) : undefined;
      const sortBy = req.query.sortBy as PhotoSortByType | undefined;
      const sortOrder = req.query.sortOrder as SortOrderType | undefined;

      const album = await photoAlbumService.getAlbumById(
        req.user!.userId,
        albumId,
        { skip, take, sortBy, sortOrder }
      );

      // Transform photoAssignments to photos for frontend compatibility
      // photoAssignments is an array of { photo: Photo, createdAt: Date }
      // We need to extract and transform each photo object
      const photoAssignments = album.photoAssignments as Array<{
        photo: PhotoWithOptionalAlbums;
        createdAt: Date;
      }> | undefined;

      const photos = photoAssignments?.map((assignment) => ({
        photo: transformPhoto(assignment.photo),
        createdAt: assignment.createdAt,
      })) || [];

      // Build response without photoAssignments
      const { photoAssignments: _, ...albumWithoutAssignments } = album;
      const transformed = {
        ...albumWithoutAssignments,
        photos,
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('Album transformation result:', {
          albumId,
          skip,
          take,
          originalPhotoAssignmentsCount: photoAssignments?.length || 0,
          transformedPhotosCount: photos.length,
          hasMore: (album as { hasMore?: boolean }).hasMore,
          total: (album as { total?: number }).total,
        });
      }

      res.json(transformed);
    } catch (error) {
      next(error);
    }
  }

  async updateAlbum(req: Request, res: Response, next: NextFunction) {
    try {
      const albumId = parseInt(req.params.id);
      const validatedData = updateAlbumSchema.parse(req.body);
      const album = await photoAlbumService.updateAlbum(
        req.user!.userId,
        albumId,
        validatedData
      );

      res.json(album);
    } catch (error) {
      next(error);
    }
  }

  async deleteAlbum(req: Request, res: Response, next: NextFunction) {
    try {
      const albumId = parseInt(req.params.id);
      await photoAlbumService.deleteAlbum(req.user!.userId, albumId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async addPhotosToAlbum(req: Request, res: Response, next: NextFunction) {
    try {
      const albumId = parseInt(req.params.id);
      const validatedData = addPhotosToAlbumSchema.parse(req.body);
      const result = await photoAlbumService.addPhotosToAlbum(
        req.user!.userId,
        albumId,
        validatedData
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async removePhotoFromAlbum(req: Request, res: Response, next: NextFunction) {
    try {
      const albumId = parseInt(req.params.id);
      const photoId = parseInt(req.params.photoId);
      await photoAlbumService.removePhotoFromAlbum(
        req.user!.userId,
        albumId,
        photoId
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export default new PhotoAlbumController();
