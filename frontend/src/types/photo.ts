export type PhotoSource = 'local' | 'immich';

export type Photo = {
  id: number;
  tripId: number;
  locationId: number | null;
  source: PhotoSource;
  immichAssetId: string | null;
  localPath: string | null;
  thumbnailPath: string | null;
  caption: string | null;
  takenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  location?: {
    id: number;
    name: string;
  };
  albums?: {
    album: {
      id: number;
      name: string;
    };
  }[];
};

export type PhotoAlbum = {
  id: number;
  tripId: number;
  name: string;
  description: string | null;
  locationId: number | null;
  activityId: number | null;
  lodgingId: number | null;
  coverPhotoId: number | null;
  createdAt: string;
  updatedAt: string;
  coverPhoto?: Photo;
  location?: {
    id: number;
    name: string;
  };
  activity?: {
    id: number;
    name: string;
  };
  lodging?: {
    id: number;
    name: string;
  };
  _count?: {
    photos: number;
    photoAssignments: number;
  };
};

export type AlbumWithPhotos = PhotoAlbum & {
  photos: {
    photo: Photo;
    addedAt: string;
  }[];
  hasMore?: boolean;
  total?: number;
};

export type UploadPhotoInput = {
  tripId: number;
  locationId?: number;
  caption?: string;
  takenAt?: string;
  latitude?: number;
  longitude?: number;
};

export type LinkImmichPhotoInput = {
  tripId: number;
  locationId?: number;
  immichAssetId: string;
  caption?: string;
  takenAt?: string;
  latitude?: number;
  longitude?: number;
};

export type UpdatePhotoInput = {
  locationId?: number | null;
  caption?: string | null;
  takenAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type CreateAlbumInput = {
  tripId: number;
  name: string;
  description?: string;
  locationId?: number | null;
  activityId?: number | null;
  lodgingId?: number | null;
  coverPhotoId?: number;
};

export type UpdateAlbumInput = {
  name?: string;
  description?: string | null;
  locationId?: number | null;
  activityId?: number | null;
  lodgingId?: number | null;
  coverPhotoId?: number | null;
};

export type AddPhotosToAlbumInput = {
  photoIds: number[];
};
