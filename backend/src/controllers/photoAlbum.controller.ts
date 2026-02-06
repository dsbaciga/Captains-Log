import { Request, Response } from 'express';
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
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { requireUserId } from '../utils/controllerHelpers';
import { signUploadPath } from '../utils/signedUrl';

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

// Helper function to add Immich URLs for photos, sign upload paths, and transform album assignments
function transformPhoto(photo: PhotoWithOptionalAlbums): TransformedPhoto {
  const transformed: TransformedPhoto = { ...photo };

  // Transform Immich paths
  if (photo.source === 'immich' && photo.immichAssetId) {
    transformed.thumbnailPath = `/api/immich/assets/${photo.immichAssetId}/thumbnail`;
    transformed.localPath = `/api/immich/assets/${photo.immichAssetId}/original`;
  } else {
    // Sign local upload paths so they can be accessed via the protected /uploads route
    transformed.localPath = signUploadPath(photo.localPath);
    transformed.thumbnailPath = signUploadPath(photo.thumbnailPath);
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

export const photoAlbumController = {
  getAllAlbums: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const skip = req.query.skip ? parseInt(req.query.skip as string) : undefined;
    const take = req.query.take ? parseInt(req.query.take as string) : undefined;

    const tagIds =
      typeof req.query.tagIds === 'string'
        ? req.query.tagIds
            .split(',')
            .map((id) => parseInt(id))
            .filter((id) => !isNaN(id))
        : undefined;

    const result = await photoAlbumService.getAllAlbums(userId, {
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
  }),

  createAlbum: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const validatedData = createAlbumSchema.parse(req.body);
    const album = await photoAlbumService.createAlbum(userId, validatedData);
    res.status(201).json(album);
  }),

  getAlbumsByTrip: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const skip = req.query.skip ? parseInt(req.query.skip as string) : undefined;
    const take = req.query.take ? parseInt(req.query.take as string) : undefined;

    if (process.env.NODE_ENV === 'development') {
      console.log('[PhotoAlbumController] getAlbumsByTrip called:', {
        userId,
        tripId,
        skip,
        take,
      });
    }

    const result = await photoAlbumService.getAlbumsByTrip(userId, tripId, {
      skip,
      take,
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
  }),

  getAlbumById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const albumId = parseId(req.params.id);
    const skip = req.query.skip ? parseInt(req.query.skip as string) : undefined;
    const take = req.query.take ? parseInt(req.query.take as string) : undefined;
    const sortBy = req.query.sortBy as PhotoSortByType | undefined;
    const sortOrder = req.query.sortOrder as SortOrderType | undefined;

    const album = await photoAlbumService.getAlbumById(userId, albumId, {
      skip,
      take,
      sortBy,
      sortOrder,
    });

    // Transform photoAssignments to photos for frontend compatibility
    // photoAssignments is an array of { photo: Photo, addedAt: Date }
    // We need to extract and transform each photo object
    const photoAssignments = album.photoAssignments as Array<{
      photo: PhotoWithOptionalAlbums;
      addedAt: Date;
    }> | undefined;

    const photos = photoAssignments?.map((assignment) => ({
      photo: transformPhoto(assignment.photo),
      addedAt: assignment.addedAt,
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
  }),

  updateAlbum: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const albumId = parseId(req.params.id);
    const validatedData = updateAlbumSchema.parse(req.body);
    const album = await photoAlbumService.updateAlbum(
      userId,
      albumId,
      validatedData
    );
    res.json(album);
  }),

  deleteAlbum: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const albumId = parseId(req.params.id);
    await photoAlbumService.deleteAlbum(userId, albumId);
    res.status(204).send();
  }),

  addPhotosToAlbum: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const albumId = parseId(req.params.id);
    const validatedData = addPhotosToAlbumSchema.parse(req.body);
    const result = await photoAlbumService.addPhotosToAlbum(
      userId,
      albumId,
      validatedData
    );
    res.json(result);
  }),

  removePhotoFromAlbum: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const albumId = parseId(req.params.id);
    const photoId = parseId(req.params.photoId, 'photoId');
    await photoAlbumService.removePhotoFromAlbum(userId, albumId, photoId);
    res.status(204).send();
  }),
};
