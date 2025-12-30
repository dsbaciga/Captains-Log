import { Request, Response, NextFunction } from 'express';
import photoAlbumService from '../services/photoAlbum.service';
import {
  createAlbumSchema,
  updateAlbumSchema,
  addPhotosToAlbumSchema,
} from '../types/photo.types';

// Helper function to add Immich URLs for photos and transform album assignments
function transformPhoto(photo: any) {
  const transformed: any = { ...photo };

  // Transform Immich paths
  if (photo.source === 'immich' && photo.immichAssetId) {
    transformed.thumbnailPath = `/api/immich/assets/${photo.immichAssetId}/thumbnail`;
    transformed.localPath = `/api/immich/assets/${photo.immichAssetId}/original`;
  }

  // Transform albumAssignments to albums for frontend compatibility
  if (photo.albumAssignments) {
    transformed.albums = photo.albumAssignments.map((assignment: any) => ({
      album: assignment.album,
    }));
    delete transformed.albumAssignments;
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
      const transformedAlbums = result.albums.map((album: any) => {
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
      const tripId = parseInt(req.params.tripId);
      const albums = await photoAlbumService.getAlbumsByTrip(
        req.user!.userId,
        tripId
      );

      res.json(albums);
    } catch (error) {
      next(error);
    }
  }

  async getAlbumById(req: Request, res: Response, next: NextFunction) {
    try {
      const albumId = parseInt(req.params.id);
      const skip = req.query.skip ? parseInt(req.query.skip as string) : undefined;
      const take = req.query.take ? parseInt(req.query.take as string) : undefined;

      const album = await photoAlbumService.getAlbumById(
        req.user!.userId,
        albumId,
        { skip, take }
      );

      // Transform photoAssignments to photos for frontend compatibility
      // photoAssignments is an array of { photo: Photo, addedAt: Date }
      // We need to extract and transform each photo object
      const transformed = {
        ...album,
        photos: album.photoAssignments?.map((assignment: any) => ({
          photo: transformPhoto(assignment.photo),
          addedAt: assignment.addedAt,
        })) || [],
      };
      delete (transformed as any).photoAssignments;

      console.log('Album transformation result:', {
        albumId,
        skip,
        take,
        originalPhotoAssignmentsCount: album.photoAssignments?.length || 0,
        transformedPhotosCount: transformed.photos.length,
        hasMore: transformed.hasMore,
        total: transformed.total,
        firstPhoto: transformed.photos[0],
      });

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
