/**
 * Test photo data fixtures for Travel Life application backend tests
 */

import { testTrips } from './trips';

// Photo source types (matching backend PhotoSource)
export const PhotoSource = {
  LOCAL: 'local',
  IMMICH: 'immich',
} as const;

export type PhotoSourceType = typeof PhotoSource[keyof typeof PhotoSource];

// Media type values
export const MediaType = {
  IMAGE: 'image',
  VIDEO: 'video',
} as const;

export type MediaTypeType = typeof MediaType[keyof typeof MediaType];

export interface TestPhoto {
  id: number;
  tripId: number;
  source: PhotoSourceType;
  mediaType: MediaTypeType;
  immichAssetId: string | null;
  localPath: string | null;
  thumbnailPath: string | null;
  duration: number | null;
  caption: string | null;
  latitude: number | null;
  longitude: number | null;
  takenAt: Date | null;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestPhotoAlbum {
  id: number;
  tripId: number;
  name: string;
  description: string | null;
  coverPhotoId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestPhotoAlbumAssignment {
  id: number;
  albumId: number;
  photoId: number;
  sortOrder: number;
  createdAt: Date;
}

export const testPhotos: Record<string, TestPhoto> = {
  // Local photo with full metadata
  localPhoto1: {
    id: 1,
    tripId: testTrips.completedTrip.id,
    source: PhotoSource.LOCAL,
    mediaType: MediaType.IMAGE,
    immichAssetId: null,
    localPath: '/uploads/photos/trip-5/photo-1.jpg',
    thumbnailPath: '/uploads/photos/trip-5/thumb-photo-1.jpg',
    duration: null,
    caption: 'Times Square at night',
    latitude: 40.7580,
    longitude: -73.9855,
    takenAt: new Date('2023-12-22T20:30:00Z'),
    uploadedAt: new Date('2023-12-22T21:00:00Z'),
    createdAt: new Date('2023-12-22T21:00:00Z'),
    updatedAt: new Date('2023-12-22T21:00:00Z'),
  },

  // Local photo without location
  localPhoto2: {
    id: 2,
    tripId: testTrips.completedTrip.id,
    source: PhotoSource.LOCAL,
    mediaType: MediaType.IMAGE,
    immichAssetId: null,
    localPath: '/uploads/photos/trip-5/photo-2.jpg',
    thumbnailPath: '/uploads/photos/trip-5/thumb-photo-2.jpg',
    duration: null,
    caption: 'Hotel room view',
    latitude: null,
    longitude: null,
    takenAt: new Date('2023-12-21T08:00:00Z'),
    uploadedAt: new Date('2023-12-21T09:00:00Z'),
    createdAt: new Date('2023-12-21T09:00:00Z'),
    updatedAt: new Date('2023-12-21T09:00:00Z'),
  },

  // Local video
  localVideo1: {
    id: 3,
    tripId: testTrips.completedTrip.id,
    source: PhotoSource.LOCAL,
    mediaType: MediaType.VIDEO,
    immichAssetId: null,
    localPath: '/uploads/photos/trip-5/video-1.mp4',
    thumbnailPath: '/uploads/photos/trip-5/thumb-video-1.jpg',
    duration: 30,
    caption: 'Street performers in Central Park',
    latitude: 40.7829,
    longitude: -73.9654,
    takenAt: new Date('2023-12-23T14:00:00Z'),
    uploadedAt: new Date('2023-12-23T15:00:00Z'),
    createdAt: new Date('2023-12-23T15:00:00Z'),
    updatedAt: new Date('2023-12-23T15:00:00Z'),
  },

  // Immich photo
  immichPhoto1: {
    id: 4,
    tripId: testTrips.planningTrip.id,
    source: PhotoSource.IMMICH,
    mediaType: MediaType.IMAGE,
    immichAssetId: 'immich-asset-uuid-12345',
    localPath: null,
    thumbnailPath: null,
    duration: null,
    caption: 'Colosseum from the outside',
    latitude: 41.8902,
    longitude: 12.4922,
    takenAt: new Date('2024-07-05T10:30:00Z'),
    uploadedAt: new Date('2024-07-05T18:00:00Z'),
    createdAt: new Date('2024-07-05T18:00:00Z'),
    updatedAt: new Date('2024-07-05T18:00:00Z'),
  },

  // Immich video
  immichVideo1: {
    id: 5,
    tripId: testTrips.planningTrip.id,
    source: PhotoSource.IMMICH,
    mediaType: MediaType.VIDEO,
    immichAssetId: 'immich-asset-uuid-67890',
    localPath: null,
    thumbnailPath: null,
    duration: 120,
    caption: 'Walking through Vatican City',
    latitude: 41.9029,
    longitude: 12.4534,
    takenAt: new Date('2024-07-06T11:00:00Z'),
    uploadedAt: new Date('2024-07-06T20:00:00Z'),
    createdAt: new Date('2024-07-06T20:00:00Z'),
    updatedAt: new Date('2024-07-06T20:00:00Z'),
  },

  // Photo without caption
  photoNoCaption: {
    id: 6,
    tripId: testTrips.completedTrip.id,
    source: PhotoSource.LOCAL,
    mediaType: MediaType.IMAGE,
    immichAssetId: null,
    localPath: '/uploads/photos/trip-5/photo-6.jpg',
    thumbnailPath: '/uploads/photos/trip-5/thumb-photo-6.jpg',
    duration: null,
    caption: null,
    latitude: 40.7484,
    longitude: -73.9857,
    takenAt: new Date('2023-12-24T16:00:00Z'),
    uploadedAt: new Date('2023-12-24T17:00:00Z'),
    createdAt: new Date('2023-12-24T17:00:00Z'),
    updatedAt: new Date('2023-12-24T17:00:00Z'),
  },
};

export const testPhotoAlbums: Record<string, TestPhotoAlbum> = {
  nycHighlights: {
    id: 1,
    tripId: testTrips.completedTrip.id,
    name: 'NYC Highlights',
    description: 'Best photos from the New York City trip',
    coverPhotoId: testPhotos.localPhoto1.id,
    createdAt: new Date('2023-12-29T10:00:00Z'),
    updatedAt: new Date('2023-12-29T10:00:00Z'),
  },

  streetPhotography: {
    id: 2,
    tripId: testTrips.completedTrip.id,
    name: 'Street Photography',
    description: 'Candid street shots',
    coverPhotoId: null,
    createdAt: new Date('2023-12-29T11:00:00Z'),
    updatedAt: new Date('2023-12-29T11:00:00Z'),
  },

  italyPlanning: {
    id: 3,
    tripId: testTrips.planningTrip.id,
    name: 'Italy Inspiration',
    description: 'Photos for trip planning',
    coverPhotoId: testPhotos.immichPhoto1.id,
    createdAt: new Date('2024-01-20T14:00:00Z'),
    updatedAt: new Date('2024-01-20T14:00:00Z'),
  },
};

export const testPhotoAlbumAssignments: TestPhotoAlbumAssignment[] = [
  {
    id: 1,
    albumId: testPhotoAlbums.nycHighlights.id,
    photoId: testPhotos.localPhoto1.id,
    sortOrder: 0,
    createdAt: new Date('2023-12-29T10:00:00Z'),
  },
  {
    id: 2,
    albumId: testPhotoAlbums.nycHighlights.id,
    photoId: testPhotos.localPhoto2.id,
    sortOrder: 1,
    createdAt: new Date('2023-12-29T10:00:00Z'),
  },
  {
    id: 3,
    albumId: testPhotoAlbums.streetPhotography.id,
    photoId: testPhotos.localVideo1.id,
    sortOrder: 0,
    createdAt: new Date('2023-12-29T11:00:00Z'),
  },
  {
    id: 4,
    albumId: testPhotoAlbums.italyPlanning.id,
    photoId: testPhotos.immichPhoto1.id,
    sortOrder: 0,
    createdAt: new Date('2024-01-20T14:00:00Z'),
  },
];

/**
 * Create a test photo with optional overrides
 */
export const createTestPhoto = (overrides: Partial<TestPhoto> = {}): TestPhoto => ({
  ...testPhotos.localPhoto1,
  ...overrides,
});

/**
 * Create a test photo album with optional overrides
 */
export const createTestPhotoAlbum = (overrides: Partial<TestPhotoAlbum> = {}): TestPhotoAlbum => ({
  ...testPhotoAlbums.nycHighlights,
  ...overrides,
});

/**
 * Valid photo upload input (for local photos)
 */
export const validUploadPhotoInput = {
  tripId: testTrips.planningTrip.id,
  caption: 'Test photo caption',
  takenAt: '2024-07-01T12:00:00Z',
  latitude: 41.8902,
  longitude: 12.4922,
};

/**
 * Valid Immich photo link input
 */
export const validLinkImmichPhotoInput = {
  tripId: testTrips.planningTrip.id,
  immichAssetId: 'new-immich-asset-uuid',
  mediaType: MediaType.IMAGE as MediaTypeType,
  caption: 'Linked from Immich',
  takenAt: '2024-07-02T14:00:00Z',
  latitude: 41.9029,
  longitude: 12.4534,
};

/**
 * Valid photo update input
 */
export const validUpdatePhotoInput = {
  caption: 'Updated caption',
  takenAt: '2024-07-01T15:00:00Z',
  latitude: 41.8900,
  longitude: 12.4920,
};

/**
 * Valid album creation input
 */
export const validCreateAlbumInput = {
  tripId: testTrips.planningTrip.id,
  name: 'New Test Album',
  description: 'A test album description',
};

/**
 * Valid album update input
 */
export const validUpdateAlbumInput = {
  name: 'Updated Album Name',
  description: 'Updated album description',
};

/**
 * Invalid inputs for validation testing
 */
export const invalidPhotoInputs = {
  invalidLatitude: {
    tripId: 1,
    latitude: 91, // Out of range
    longitude: 0,
  },
  invalidLongitude: {
    tripId: 1,
    latitude: 0,
    longitude: 181, // Out of range
  },
};

export const invalidAlbumInputs = {
  emptyName: {
    tripId: 1,
    name: '',
    description: 'Valid description',
  },
  nameTooLong: {
    tripId: 1,
    name: 'A'.repeat(256), // Exceeds 200 char limit
    description: 'Valid description',
  },
};

/**
 * Get photos for a specific trip
 */
export const getPhotosForTrip = (tripId: number): TestPhoto[] => {
  return Object.values(testPhotos).filter(photo => photo.tripId === tripId);
};

/**
 * Get albums for a specific trip
 */
export const getAlbumsForTrip = (tripId: number): TestPhotoAlbum[] => {
  return Object.values(testPhotoAlbums).filter(album => album.tripId === tripId);
};
