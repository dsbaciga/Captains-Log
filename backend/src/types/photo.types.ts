import { z } from 'zod';

export const PhotoSource = {
  LOCAL: 'local',
  IMMICH: 'immich',
} as const;

export type PhotoSourceType = typeof PhotoSource[keyof typeof PhotoSource];

export interface Photo {
  id: number;
  tripId: number;
  source: PhotoSourceType;
  immichAssetId: string | null;
  localPath: string | null;
  thumbnailPath: string | null;
  caption: string | null;
  takenAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Note: Location, Activity, and Lodging associations are handled via EntityLink system, not direct FKs
export interface PhotoAlbum {
  id: number;
  tripId: number;
  name: string;
  description: string | null;
  coverPhotoId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhotoWithDetails extends Photo {
  albums?: PhotoAlbum[];
}

export interface AlbumWithPhotos extends PhotoAlbum {
  photos: Photo[];
  _count?: {
    photos: number;
  };
}

// Validation schemas
export const uploadPhotoSchema = z.object({
  tripId: z.number(),
  caption: z.string().max(1000).optional(),
  takenAt: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const linkImmichPhotoSchema = z.object({
  tripId: z.number(),
  immichAssetId: z.string().min(1),
  caption: z.string().max(1000).optional(),
  takenAt: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const linkImmichPhotoBatchSchema = z.object({
  tripId: z.number(),
  assets: z.array(z.object({
    immichAssetId: z.string().min(1),
    caption: z.string().max(1000).optional(),
    takenAt: z.string().optional().nullable(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
  })).min(1),
});

export const updatePhotoSchema = z.object({
  caption: z.string().max(1000).optional().nullable(),
  takenAt: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

// Note: Location, Activity, and Lodging associations are handled via EntityLink system, not direct FKs
export const createAlbumSchema = z.object({
  tripId: z.number(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  coverPhotoId: z.number().optional(),
});

// Note: Location, Activity, and Lodging associations are handled via EntityLink system, not direct FKs
export const updateAlbumSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  coverPhotoId: z.number().optional().nullable(),
});

export const addPhotosToAlbumSchema = z.object({
  photoIds: z.array(z.number()).min(1),
});

export const acceptAlbumSuggestionSchema = z.object({
  name: z.string().min(1).max(255),
  photoIds: z.array(z.number().int().positive()).min(1).max(1000),
});

// Photo sorting types
export const PhotoSortBy = {
  DATE: 'date',
  CAPTION: 'caption',
  LOCATION: 'location',
  CREATED: 'created',
} as const;

export type PhotoSortByType = typeof PhotoSortBy[keyof typeof PhotoSortBy];

export const SortOrder = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortOrderType = typeof SortOrder[keyof typeof SortOrder];

export interface PhotoQueryOptions {
  skip?: number;
  take?: number;
  sortBy?: PhotoSortByType;
  sortOrder?: SortOrderType;
}

export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>;
export type LinkImmichPhotoInput = z.infer<typeof linkImmichPhotoSchema>;
export type LinkImmichPhotoBatchInput = z.infer<typeof linkImmichPhotoBatchSchema>;
export type UpdatePhotoInput = z.infer<typeof updatePhotoSchema>;
export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;
export type UpdateAlbumInput = z.infer<typeof updateAlbumSchema>;
export type AddPhotosToAlbumInput = z.infer<typeof addPhotosToAlbumSchema>;
export type AcceptAlbumSuggestionInput = z.infer<typeof acceptAlbumSuggestionSchema>;
