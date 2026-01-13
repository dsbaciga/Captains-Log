import { Request, Response, NextFunction } from 'express';
import photoService from '../services/photo.service';
import {
  uploadPhotoSchema,
  linkImmichPhotoSchema,
  linkImmichPhotoBatchSchema,
  updatePhotoSchema,
} from '../types/photo.types';
import { AppError } from '../utils/errors';

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

class PhotoController {
  async uploadPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('No file provided', 400);
      }

      const validatedData = uploadPhotoSchema.parse({
        ...req.body,
        tripId: parseInt(req.body.tripId),
        latitude: req.body.latitude ? parseFloat(req.body.latitude) : undefined,
        longitude: req.body.longitude
          ? parseFloat(req.body.longitude)
          : undefined,
      });

      const photo = await photoService.uploadPhoto(
        req.user!.userId,
        req.file,
        validatedData
      );

      res.status(201).json(transformPhoto(photo));
    } catch (error) {
      next(error);
    }
  }

  async linkImmichPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = linkImmichPhotoSchema.parse(req.body);
      const photo = await photoService.linkImmichPhoto(
        req.user!.userId,
        validatedData
      );

      res.status(201).json(transformPhoto(photo));
    } catch (error) {
      next(error);
    }
  }

  async linkImmichPhotosBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = linkImmichPhotoBatchSchema.parse(req.body);
      const results = await photoService.linkImmichPhotosBatch(
        req.user!.userId,
        validatedData
      );

      res.status(201).json({
        status: 'success',
        data: results,
        message: `Successfully linked ${results.successful} photos (${results.failed} failed)`,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPhotosByTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const tripId = parseInt(req.params.tripId);
      const skip = req.query.skip ? parseInt(req.query.skip as string) : undefined;
      const take = req.query.take ? parseInt(req.query.take as string) : undefined;
      const sortBy = req.query.sortBy as string | undefined;
      const sortOrder = req.query.sortOrder as string | undefined;

      const result = await photoService.getPhotosByTrip(req.user!.userId, tripId, {
        skip,
        take,
        sortBy,
        sortOrder,
      });

      // Add thumbnail URLs for Immich photos
      const photosWithUrls = result.photos.map(transformPhoto);

      res.json({
        photos: photosWithUrls,
        total: result.total,
        hasMore: result.hasMore,
      });
    } catch (error) {
      next(error);
    }
  }

  async getImmichAssetIdsByTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const tripId = parseInt(req.params.tripId);
      const assetIds = await photoService.getImmichAssetIdsByTrip(req.user!.userId, tripId);
      res.json({ assetIds });
    } catch (error) {
      next(error);
    }
  }

  async getUnsortedPhotosByTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const tripId = parseInt(req.params.tripId);
      const skip = req.query.skip ? parseInt(req.query.skip as string) : undefined;
      const take = req.query.take ? parseInt(req.query.take as string) : undefined;
      const sortBy = req.query.sortBy as string | undefined;
      const sortOrder = req.query.sortOrder as string | undefined;

      const result = await photoService.getUnsortedPhotosByTrip(req.user!.userId, tripId, {
        skip,
        take,
        sortBy,
        sortOrder,
      });

      // Add thumbnail URLs for Immich photos
      const photosWithUrls = result.photos.map(transformPhoto);

      res.json({
        photos: photosWithUrls,
        total: result.total,
        hasMore: result.hasMore,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPhotoById(req: Request, res: Response, next: NextFunction) {
    try {
      const photoId = parseInt(req.params.id);
      const photo = await photoService.getPhotoById(req.user!.userId, photoId);

      res.json(transformPhoto(photo));
    } catch (error) {
      next(error);
    }
  }

  async updatePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const photoId = parseInt(req.params.id);
      const validatedData = updatePhotoSchema.parse(req.body);
      const photo = await photoService.updatePhoto(
        req.user!.userId,
        photoId,
        validatedData
      );

      res.json(transformPhoto(photo));
    } catch (error) {
      next(error);
    }
  }

  async deletePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const photoId = parseInt(req.params.id);
      await photoService.deletePhoto(req.user!.userId, photoId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export default new PhotoController();
