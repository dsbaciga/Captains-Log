import { z } from 'zod';

export const PhotoSource = {
  LOCAL: 'local',
  IMMICH: 'immich',
} as const;

export type PhotoSourceType = typeof PhotoSource[keyof typeof PhotoSource];

export interface Photo {
  id: number;
  tripId: number;
  locationId: number | null;
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

export interface PhotoAlbum {
  id: number;
  tripId: number;
  name: string;
  description: string | null;
  locationId: number | null;
  activityId: number | null;
  lodgingId: number | null;
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
  locationId: z.number().optional(),
  caption: z.string().max(1000).optional(),
  takenAt: z.string().datetime().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const linkImmichPhotoSchema = z.object({
  tripId: z.number(),
  locationId: z.number().optional(),
  immichAssetId: z.string().min(1),
  caption: z.string().max(1000).optional(),
  takenAt: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const updatePhotoSchema = z.object({
  locationId: z.number().optional().nullable(),
  caption: z.string().max(1000).optional().nullable(),
  takenAt: z.string().datetime().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const createAlbumSchema = z.object({
  tripId: z.number(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  locationId: z.number().optional().nullable(),
  activityId: z.number().optional().nullable(),
  lodgingId: z.number().optional().nullable(),
  coverPhotoId: z.number().optional(),
});

export const updateAlbumSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  locationId: z.number().optional().nullable(),
  activityId: z.number().optional().nullable(),
  lodgingId: z.number().optional().nullable(),
  coverPhotoId: z.number().optional().nullable(),
});

export const addPhotosToAlbumSchema = z.object({
  photoIds: z.array(z.number()).min(1),
});

export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>;
export type LinkImmichPhotoInput = z.infer<typeof linkImmichPhotoSchema>;
export type UpdatePhotoInput = z.infer<typeof updatePhotoSchema>;
export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;
export type UpdateAlbumInput = z.infer<typeof updateAlbumSchema>;
export type AddPhotosToAlbumInput = z.infer<typeof addPhotosToAlbumSchema>;
