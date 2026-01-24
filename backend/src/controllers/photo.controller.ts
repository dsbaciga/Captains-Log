import { Request, Response, NextFunction } from 'express';
import photoService from '../services/photo.service';
import albumSuggestionService from '../services/albumSuggestion.service';
import {
  uploadPhotoSchema,
  linkImmichPhotoSchema,
  linkImmichPhotoBatchSchema,
  updatePhotoSchema,
  acceptAlbumSuggestionSchema,
  PhotoAlbum,
} from '../types/photo.types';
import { AppError } from '../utils/errors';
import { parseId } from '../utils/parseId';
import { requireUserId } from '../utils/controllerHelpers';

// Type for photo input that may have album assignments
interface PhotoWithOptionalAlbums {
  id: number;
  tripId: number;
  source: string;
  immichAssetId?: string | null;
  localPath?: string | null;
  thumbnailPath?: string | null;
  caption?: string | null;
  takenAt?: Date | null;
  latitude?: number | null;
  longitude?: number | null;
  albumAssignments?: Array<{
    album: PhotoAlbum;
    addedAt?: Date;
  }>;
  [key: string]: unknown;
}

// Type for transformed photo output
interface TransformedPhoto extends Omit<PhotoWithOptionalAlbums, 'albumAssignments'> {
  albums?: Array<{ album: PhotoAlbum }>;
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
        requireUserId(req),
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
        requireUserId(req),
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
        requireUserId(req),
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
      const tripId = parseId(req.params.tripId, 'tripId');
      const skip = req.query.skip ? parseInt(req.query.skip as string) : undefined;
      const take = req.query.take ? parseInt(req.query.take as string) : undefined;
      const sortBy = req.query.sortBy as string | undefined;
      const sortOrder = req.query.sortOrder as string | undefined;

      const result = await photoService.getPhotosByTrip(requireUserId(req), tripId, {
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
      const tripId = parseId(req.params.tripId, 'tripId');
      const assetIds = await photoService.getImmichAssetIdsByTrip(requireUserId(req), tripId);
      res.json({ assetIds });
    } catch (error) {
      next(error);
    }
  }

  async getUnsortedPhotosByTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const tripId = parseId(req.params.tripId, 'tripId');
      const skip = req.query.skip ? parseInt(req.query.skip as string) : undefined;
      const take = req.query.take ? parseInt(req.query.take as string) : undefined;
      const sortBy = req.query.sortBy as string | undefined;
      const sortOrder = req.query.sortOrder as string | undefined;

      const result = await photoService.getUnsortedPhotosByTrip(requireUserId(req), tripId, {
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
      const photoId = parseId(req.params.id);
      const photo = await photoService.getPhotoById(requireUserId(req), photoId);

      res.json(transformPhoto(photo));
    } catch (error) {
      next(error);
    }
  }

  async updatePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const photoId = parseId(req.params.id);
      const validatedData = updatePhotoSchema.parse(req.body);
      const photo = await photoService.updatePhoto(
        requireUserId(req),
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
      const photoId = parseId(req.params.id);
      await photoService.deletePhoto(requireUserId(req), photoId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getPhotoDateGroupings(req: Request, res: Response, next: NextFunction) {
    try {
      const tripId = parseId(req.params.tripId, 'tripId');
      const timezone = req.query.timezone as string | undefined;

      const result = await photoService.getPhotoDateGroupings(
        requireUserId(req),
        tripId,
        timezone
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getPhotosByDate(req: Request, res: Response, next: NextFunction) {
    try {
      const tripId = parseId(req.params.tripId, 'tripId');
      const date = req.params.date; // YYYY-MM-DD format
      const timezone = req.query.timezone as string | undefined;

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new AppError('Invalid date format. Use YYYY-MM-DD', 400);
      }

      // Validate date is a valid calendar date
      const parsedDate = new Date(date + 'T12:00:00Z');
      if (isNaN(parsedDate.getTime())) {
        throw new AppError('Invalid date value', 400);
      }

      const result = await photoService.getPhotosByDate(
        requireUserId(req),
        tripId,
        date,
        timezone
      );

      // Transform photos for frontend
      const photosWithUrls = result.photos.map(transformPhoto);

      res.json({
        photos: photosWithUrls,
        date: result.date,
        count: result.count,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAlbumSuggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const tripId = parseId(req.params.tripId, 'tripId');
      const suggestions = await albumSuggestionService.getAlbumSuggestions(
        requireUserId(req),
        tripId
      );

      res.json(suggestions);
    } catch (error) {
      next(error);
    }
  }

  async acceptAlbumSuggestion(req: Request, res: Response, next: NextFunction) {
    try {
      const tripId = parseId(req.params.tripId, 'tripId');

      // Validate input with Zod schema
      const validationResult = acceptAlbumSuggestionSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new AppError(
          `Invalid suggestion data: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
          400
        );
      }

      const { name, photoIds } = validationResult.data;

      const result = await albumSuggestionService.acceptSuggestion(
        requireUserId(req),
        tripId,
        { name, photoIds }
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new PhotoController();
