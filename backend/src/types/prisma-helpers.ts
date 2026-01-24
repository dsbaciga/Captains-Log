/**
 * Shared Prisma helper types for type-safe database operations
 * This file provides common type definitions derived from Prisma's generated types
 * to avoid using 'any' throughout the codebase.
 */

import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AxiosError } from 'axios';

// =============================================================================
// TRIP TYPES WITH RELATIONS
// =============================================================================

/**
 * Trip with all common relations for validation and backup operations
 */
export type TripWithRelations = Prisma.TripGetPayload<{
  include: {
    activities: true;
    lodging: true;
    transportation: true;
    locations: true;
    journalEntries: true;
  };
}>;

/**
 * Trip with full relations including nested data for backup
 */
export type TripWithFullRelations = Prisma.TripGetPayload<{
  include: {
    locations: {
      include: {
        category: true;
        children: true;
      };
    };
    transportation: {
      include: {
        startLocation: true;
        endLocation: true;
        flightTracking: true;
      };
    };
    lodging: true;
    activities: {
      include: {
        children: true;
      };
    };
    journalEntries: true;
    photoAlbums: {
      include: {
        photoAssignments: {
          include: {
            photo: true;
          };
        };
      };
    };
    photos: true;
    weatherData: true;
    tagAssignments: {
      include: {
        tag: true;
      };
    };
    companionAssignments: {
      include: {
        companion: true;
      };
    };
    checklists: {
      include: {
        items: true;
      };
    };
    entityLinks: true;
  };
}>;

// =============================================================================
// CHECKLIST TYPES
// =============================================================================

/**
 * Checklist with items for full data access
 */
export type ChecklistWithItems = Prisma.ChecklistGetPayload<{
  include: { items: true };
}>;

/**
 * Checklist item metadata structure
 */
export interface ChecklistItemMetadata {
  code?: string;
  name?: string;
  country?: string;
  [key: string]: unknown; // Allow additional properties
}

// =============================================================================
// PHOTO ALBUM TYPES
// =============================================================================

/**
 * Photo album with photo assignments
 */
export type AlbumWithPhotos = Prisma.PhotoAlbumGetPayload<{
  include: {
    photoAssignments: {
      include: {
        photo: true;
      };
    };
  };
}>;

/**
 * Photo album with cover photo and count
 */
export type AlbumWithCoverAndCount = Prisma.PhotoAlbumGetPayload<{
  include: {
    coverPhoto: true;
    _count: {
      select: {
        photoAssignments: true;
      };
    };
  };
}>;

// =============================================================================
// COORDINATE TYPES
// =============================================================================

/**
 * Interface for objects with optional decimal coordinates
 */
export interface WithOptionalCoordinates {
  latitude?: Decimal | number | null;
  longitude?: Decimal | number | null;
}

/**
 * Interface for objects with numeric coordinates (after conversion)
 */
export interface WithNumericCoordinates {
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Convert Prisma Decimal coordinates to numbers
 */
export function convertDecimalCoordinates<T extends WithOptionalCoordinates>(
  obj: T
): Omit<T, 'latitude' | 'longitude'> & WithNumericCoordinates {
  return {
    ...obj,
    latitude: obj.latitude ? Number(obj.latitude) : null,
    longitude: obj.longitude ? Number(obj.longitude) : null,
  };
}

// =============================================================================
// ERROR HANDLING TYPES
// =============================================================================

/**
 * Prisma error interface for error handling
 */
export interface PrismaError extends Error {
  code?: string;
  meta?: { target?: string[] };
}

/**
 * Type guard for Prisma known request errors
 */
export function isPrismaError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

/**
 * Type guard for Prisma unknown request errors
 */
export function isPrismaUnknownError(
  error: unknown
): error is Prisma.PrismaClientUnknownRequestError {
  return error instanceof Prisma.PrismaClientUnknownRequestError;
}

/**
 * Type guard for Axios errors
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Extract error status code for HTTP responses
 */
export function getErrorStatusCode(error: unknown, defaultCode = 500): number {
  if (isAxiosError(error)) {
    return error.response?.status || defaultCode;
  }
  if (
    error !== null &&
    typeof error === 'object' &&
    'statusCode' in error &&
    typeof (error as { statusCode: unknown }).statusCode === 'number'
  ) {
    return (error as { statusCode: number }).statusCode;
  }
  return defaultCode;
}

// =============================================================================
// EXTERNAL API TYPES
// =============================================================================

/**
 * Immich search query parameters
 */
export interface ImmichSearchQuery {
  isFavorite?: boolean;
  isArchived?: boolean;
  takenAfter?: string;
  takenBefore?: string;
  city?: string;
  country?: string;
  make?: string;
  model?: string;
}

/**
 * Immich asset options
 */
export interface ImmichAssetOptions {
  skip?: number;
  take?: number;
  isFavorite?: boolean;
  isArchived?: boolean;
  order?: 'asc' | 'desc';
}

/**
 * Immich asset response
 */
export interface ImmichAsset {
  id: string;
  deviceAssetId?: string;
  ownerId?: string;
  deviceId?: string;
  type: string;
  originalPath?: string;
  originalFileName?: string;
  fileCreatedAt?: string;
  fileModifiedAt?: string;
  localDateTime?: string;
  updatedAt?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  isOffline?: boolean;
  duration?: string;
  exifInfo?: {
    make?: string;
    model?: string;
    exifImageWidth?: number;
    exifImageHeight?: number;
    fileSizeInByte?: number;
    orientation?: string;
    dateTimeOriginal?: string;
    modifyDate?: string;
    timeZone?: string;
    lensModel?: string;
    fNumber?: number;
    focalLength?: number;
    iso?: number;
    exposureTime?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    state?: string;
    country?: string;
    description?: string;
  };
  smartInfo?: {
    tags?: string[];
    objects?: string[];
  };
  thumbhash?: string;
  checksum?: string;
}

/**
 * Immich album response
 */
export interface ImmichAlbum {
  id: string;
  albumName: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  albumThumbnailAssetId?: string;
  assetCount?: number;
  shared?: boolean;
  ownerId?: string;
}

// =============================================================================
// WEATHER API TYPES
// =============================================================================

/**
 * OpenWeatherMap API response structure
 */
export interface OpenWeatherResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  daily?: Array<{
    dt: number;
    sunrise?: number;
    sunset?: number;
    temp: {
      day?: number;
      min?: number;
      max?: number;
      night?: number;
      eve?: number;
      morn?: number;
    };
    feels_like?: {
      day?: number;
      night?: number;
      eve?: number;
      morn?: number;
    };
    pressure?: number;
    humidity?: number;
    dew_point?: number;
    wind_speed?: number;
    wind_deg?: number;
    weather?: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    clouds?: number;
    pop?: number;
    rain?: number;
    snow?: number;
    uvi?: number;
  }>;
}

// =============================================================================
// ROUTING TYPES
// =============================================================================

/**
 * Route step for navigation
 */
export interface RouteStep {
  distance: number;
  duration: number;
  instruction?: string;
  name?: string;
  type?: number;
  way_points?: number[];
}

/**
 * Route cache entry
 */
export interface RouteCacheEntry {
  distance: number;
  duration: number;
  geometry?: Array<[number, number]>;
  steps?: RouteStep[];
}

/**
 * OpenRouteService directions response
 */
export interface OpenRouteServiceResponse {
  routes?: Array<{
    summary?: {
      distance: number;
      duration: number;
    };
    geometry?: string;
    segments?: Array<{
      distance: number;
      duration: number;
      steps?: RouteStep[];
    }>;
  }>;
}

// =============================================================================
// PRISMA DYNAMIC MODEL ACCESS
// =============================================================================

/**
 * Valid Prisma model names for dynamic access
 */
export type PrismaModelName = Exclude<
  keyof Prisma.TypeMap['model'],
  symbol | number
>;

/**
 * Type-safe Prisma model delegate
 */
export type PrismaModelDelegate = {
  findMany: (args?: unknown) => Promise<unknown[]>;
  findUnique: (args: unknown) => Promise<unknown | null>;
  findFirst: (args?: unknown) => Promise<unknown | null>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
  count: (args?: unknown) => Promise<number>;
};

// =============================================================================
// SEARCH RESULT TYPES
// =============================================================================

/**
 * Generic search result
 */
export interface SearchResult {
  type: 'trip' | 'location' | 'activity' | 'photo' | 'lodging' | 'transportation' | 'journal';
  id: number;
  title: string;
  subtitle?: string;
  tripId: number;
  tripTitle?: string;
  relevance?: number;
}

// =============================================================================
// SWAGGER/OPENAPI TYPES
// =============================================================================

/**
 * Swagger specification object
 */
export interface SwaggerSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, unknown>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
}
