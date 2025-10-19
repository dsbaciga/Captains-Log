export interface ImmichAsset {
  id: string;
  deviceAssetId: string;
  ownerId: string;
  deviceId: string;
  type: 'IMAGE' | 'VIDEO';
  originalPath: string;
  originalFileName: string;
  resized: boolean;
  thumbhash: string | null;
  fileCreatedAt: string;
  fileModifiedAt: string;
  updatedAt: string;
  isFavorite: boolean;
  isArchived: boolean;
  duration: string | null;
  thumbnailUrl?: string;
  fileUrl?: string;
  exifInfo?: {
    latitude?: number;
    longitude?: number;
    dateTimeOriginal?: string;
    make?: string;
    model?: string;
    lensModel?: string;
    fNumber?: number;
    focalLength?: number;
    iso?: number;
    exposureTime?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export interface ImmichAlbum {
  id: string;
  ownerId: string;
  albumName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  albumThumbnailAssetId: string | null;
  shared: boolean;
  assets: ImmichAsset[];
  assetCount: number;
}

export interface ImmichSettings {
  immichApiUrl: string | null;
  immichApiKeySet: boolean;
  immichConfigured: boolean;
}

export interface ImmichConnectionTest {
  success: boolean;
  connected: boolean;
  message: string;
}
