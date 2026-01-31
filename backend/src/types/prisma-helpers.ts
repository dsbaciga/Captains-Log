/**
 * Shared Prisma helper types for type-safe database operations
 * This file provides common type definitions derived from Prisma's generated types
 * to avoid using 'any' throughout the codebase.
 */

import { Prisma, Decimal } from '@prisma/client';
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
 * Trip with relations needed for validation including dismissed issues
 */
export type TripWithValidationRelations = Prisma.TripGetPayload<{
  include: {
    activities: true;
    lodging: true;
    transportation: true;
    locations: true;
    journalEntries: true;
    dismissedValidationIssues: true;
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
 * Immich search query parameters for filtering assets.
 *
 * All fields are optional and can be combined for advanced filtering.
 * Date fields should be ISO 8601 formatted strings.
 *
 * @example
 * ```typescript
 * const query: ImmichSearchQuery = {
 *   isFavorite: true,
 *   takenAfter: '2024-01-01T00:00:00Z',
 *   country: 'France'
 * };
 * ```
 */
export interface ImmichSearchQuery {
  /** Filter to only favorite assets */
  isFavorite?: boolean;
  /** Filter to only archived assets */
  isArchived?: boolean;
  /** Only include assets taken after this ISO 8601 date */
  takenAfter?: string;
  /** Only include assets taken before this ISO 8601 date */
  takenBefore?: string;
  /** Filter by city from EXIF location data */
  city?: string;
  /** Filter by country from EXIF location data */
  country?: string;
  /** Filter by camera make (e.g., 'Apple', 'Canon') */
  make?: string;
  /** Filter by camera model (e.g., 'iPhone 15 Pro') */
  model?: string;
}

/**
 * Options for paginating and filtering Immich asset requests.
 *
 * @example
 * ```typescript
 * const options: ImmichAssetOptions = {
 *   skip: 0,
 *   take: 50,
 *   order: 'desc'
 * };
 * ```
 */
export interface ImmichAssetOptions {
  /** Number of assets to skip (for pagination) */
  skip?: number;
  /** Number of assets to return (page size) */
  take?: number;
  /** Filter to only favorite assets */
  isFavorite?: boolean;
  /** Filter to only archived assets */
  isArchived?: boolean;
  /** Sort order by date: 'asc' (oldest first) or 'desc' (newest first) */
  order?: 'asc' | 'desc';
}

/**
 * Represents a single asset (photo/video) from the Immich API.
 *
 * **Required fields:**
 * - `id` - Unique identifier for the asset (always present)
 * - `type` - Asset type: 'IMAGE' or 'VIDEO' (always present)
 *
 * **Commonly available fields:**
 * - `originalFileName` - Original filename from device
 * - `fileCreatedAt` - When the file was created (ISO 8601)
 * - `exifInfo` - EXIF metadata (camera info, GPS coordinates, etc.)
 *
 * **Optional/conditional fields:**
 * - `duration` - Only present for VIDEO type assets
 * - `smartInfo` - AI-detected tags and objects (requires Immich ML)
 * - `thumbhash` - Blur hash for placeholder images
 *
 * @example
 * ```typescript
 * // Accessing an asset's location
 * if (asset.exifInfo?.latitude && asset.exifInfo?.longitude) {
 *   console.log(`Photo taken at: ${asset.exifInfo.latitude}, ${asset.exifInfo.longitude}`);
 * }
 * ```
 */
export interface ImmichAsset {
  /** Unique identifier for the asset (required) */
  id: string;
  /** Device-specific asset identifier */
  deviceAssetId?: string;
  /** ID of the asset owner */
  ownerId?: string;
  /** ID of the device that uploaded the asset */
  deviceId?: string;
  /** Asset type: 'IMAGE' or 'VIDEO' (required) */
  type: string;
  /** Original file path on the storage server */
  originalPath?: string;
  /** Original filename from the device */
  originalFileName?: string;
  /** When the file was created (ISO 8601) */
  fileCreatedAt?: string;
  /** When the file was last modified (ISO 8601) */
  fileModifiedAt?: string;
  /** Local date/time from EXIF data (ISO 8601) */
  localDateTime?: string;
  /** When the Immich record was last updated (ISO 8601) */
  updatedAt?: string;
  /** Whether the asset is marked as favorite */
  isFavorite?: boolean;
  /** Whether the asset is archived */
  isArchived?: boolean;
  /** Whether the asset file is offline/unavailable */
  isOffline?: boolean;
  /** Video duration (only for VIDEO type, format: 'HH:MM:SS.mmm') */
  duration?: string;
  /**
   * EXIF metadata extracted from the image/video file.
   * Contains camera info, GPS coordinates, and image dimensions.
   */
  exifInfo?: {
    /** Camera manufacturer (e.g., 'Apple', 'Canon', 'Sony') */
    make?: string;
    /** Camera model (e.g., 'iPhone 15 Pro', 'EOS R5') */
    model?: string;
    /** Image width in pixels */
    exifImageWidth?: number;
    /** Image height in pixels */
    exifImageHeight?: number;
    /** File size in bytes */
    fileSizeInByte?: number;
    /** Image orientation (1-8, per EXIF spec) */
    orientation?: string;
    /** Original capture date/time from EXIF (ISO 8601) */
    dateTimeOriginal?: string;
    /** Last modification date from EXIF (ISO 8601) */
    modifyDate?: string;
    /** Timezone identifier (e.g., 'America/New_York') */
    timeZone?: string;
    /** Lens model used */
    lensModel?: string;
    /** Aperture f-number (e.g., 2.8) */
    fNumber?: number;
    /** Focal length in mm */
    focalLength?: number;
    /** ISO sensitivity value */
    iso?: number;
    /** Exposure time (e.g., '1/125') */
    exposureTime?: string;
    /** GPS latitude (decimal degrees, positive = North) */
    latitude?: number;
    /** GPS longitude (decimal degrees, positive = East) */
    longitude?: number;
    /** City name from reverse geocoding */
    city?: string;
    /** State/province name from reverse geocoding */
    state?: string;
    /** Country name from reverse geocoding */
    country?: string;
    /** User-provided description/caption */
    description?: string;
  };
  /**
   * AI-detected information (requires Immich machine learning service).
   * May not be present if ML is disabled or processing is incomplete.
   */
  smartInfo?: {
    /** AI-detected scene/content tags */
    tags?: string[];
    /** AI-detected objects in the image */
    objects?: string[];
  };
  /** BlurHash placeholder for progressive loading */
  thumbhash?: string;
  /** File checksum for deduplication */
  checksum?: string;
}

/**
 * Represents an album from the Immich API.
 *
 * **Required fields:**
 * - `id` - Unique identifier for the album
 * - `albumName` - Name/title of the album
 *
 * **Commonly available fields:**
 * - `assetCount` - Number of assets in the album
 * - `albumThumbnailAssetId` - ID of the cover photo asset
 *
 * @example
 * ```typescript
 * // Display album with count
 * console.log(`${album.albumName} (${album.assetCount ?? 0} photos)`);
 * ```
 */
export interface ImmichAlbum {
  /** Unique identifier for the album (required) */
  id: string;
  /** Album name/title (required) */
  albumName: string;
  /** Optional album description */
  description?: string;
  /** When the album was created (ISO 8601) */
  createdAt?: string;
  /** When the album was last updated (ISO 8601) */
  updatedAt?: string;
  /** Asset ID used as the album cover/thumbnail */
  albumThumbnailAssetId?: string;
  /** Number of assets in the album */
  assetCount?: number;
  /** Whether the album is shared with other users */
  shared?: boolean;
  /** ID of the album owner */
  ownerId?: string;
}

// =============================================================================
// WEATHER API TYPES
// =============================================================================

/**
 * OpenWeatherMap One Call API response structure.
 *
 * This interface represents the response from OpenWeatherMap's One Call API 3.0
 * when requesting daily forecast data.
 *
 * **Required fields (always present):**
 * - `lat`, `lon` - Coordinates of the location
 * - `timezone` - IANA timezone identifier
 * - `timezone_offset` - UTC offset in seconds
 *
 * **Optional fields:**
 * - `daily` - Array of daily forecasts (up to 8 days)
 *
 * **Daily forecast required fields:**
 * - `dt` - Unix timestamp for the forecast date
 * - `temp` - Temperature object (at minimum has structure, values may be undefined)
 *
 * @see https://openweathermap.org/api/one-call-3
 *
 * @example
 * ```typescript
 * // Extracting weather for a specific day
 * const today = response.daily?.[0];
 * if (today) {
 *   const high = today.temp.max;
 *   const low = today.temp.min;
 *   const conditions = today.weather?.[0]?.description;
 * }
 * ```
 */
export interface OpenWeatherResponse {
  /** Latitude of the location (required) */
  lat: number;
  /** Longitude of the location (required) */
  lon: number;
  /** IANA timezone identifier (e.g., 'America/New_York') (required) */
  timezone: string;
  /** UTC offset in seconds (e.g., -18000 for EST) (required) */
  timezone_offset: number;
  /**
   * Daily forecast data for up to 8 days.
   * May be undefined if daily forecast was not requested.
   */
  daily?: Array<{
    /** Unix timestamp (seconds) for the forecast date (required) */
    dt: number;
    /** Sunrise time as Unix timestamp */
    sunrise?: number;
    /** Sunset time as Unix timestamp */
    sunset?: number;
    /**
     * Temperature data in the requested units (Kelvin, Celsius, or Fahrenheit).
     * Structure is always present, but individual values may be undefined.
     */
    temp: {
      /** Midday temperature */
      day?: number;
      /** Minimum daily temperature */
      min?: number;
      /** Maximum daily temperature */
      max?: number;
      /** Night temperature */
      night?: number;
      /** Evening temperature */
      eve?: number;
      /** Morning temperature */
      morn?: number;
    };
    /** "Feels like" temperatures accounting for humidity and wind */
    feels_like?: {
      day?: number;
      night?: number;
      eve?: number;
      morn?: number;
    };
    /** Atmospheric pressure in hPa */
    pressure?: number;
    /** Humidity percentage (0-100) */
    humidity?: number;
    /** Dew point temperature */
    dew_point?: number;
    /** Wind speed in requested units (m/s or mph) */
    wind_speed?: number;
    /** Wind direction in degrees (meteorological) */
    wind_deg?: number;
    /**
     * Weather conditions array.
     * Usually contains one element, but can have multiple for complex conditions.
     */
    weather?: Array<{
      /** Weather condition ID (see OpenWeatherMap condition codes) */
      id: number;
      /** Group of weather parameters (Rain, Snow, Clouds, etc.) */
      main: string;
      /** Human-readable description (e.g., 'light rain') */
      description: string;
      /** Weather icon ID for OpenWeatherMap icons */
      icon: string;
    }>;
    /** Cloudiness percentage (0-100) */
    clouds?: number;
    /** Probability of precipitation (0-1) */
    pop?: number;
    /** Rain volume in mm (if applicable) */
    rain?: number;
    /** Snow volume in mm (if applicable) */
    snow?: number;
    /** UV index */
    uvi?: number;
  }>;
}

/**
 * Simplified weather data result for a specific date.
 *
 * This type provides a normalized structure for weather data after processing
 * the raw OpenWeatherMap API response. Use this type in services and components
 * that consume weather data.
 *
 * All weather values are nullable to handle cases where data is unavailable.
 *
 * @example
 * ```typescript
 * // Creating weather result from API response
 * const result: WeatherDateResult = {
 *   date: new Date(dailyData.dt * 1000),
 *   temperatureHigh: dailyData.temp.max ?? null,
 *   temperatureLow: dailyData.temp.min ?? null,
 *   conditions: dailyData.weather?.[0]?.description ?? null,
 *   precipitation: dailyData.rain ?? dailyData.snow ?? null,
 *   humidity: dailyData.humidity ?? null,
 *   windSpeed: dailyData.wind_speed ?? null
 * };
 * ```
 */
export type WeatherDateResult = {
  /** The date this weather data applies to */
  date: Date;
  /** High temperature for the day (in configured units), null if unavailable */
  temperatureHigh: number | null;
  /** Low temperature for the day (in configured units), null if unavailable */
  temperatureLow: number | null;
  /** Human-readable weather conditions (e.g., 'partly cloudy'), null if unavailable */
  conditions: string | null;
  /** Precipitation amount in mm, null if unavailable or none */
  precipitation: number | null;
  /** Humidity percentage (0-100), null if unavailable */
  humidity: number | null;
  /** Wind speed (in configured units), null if unavailable */
  windSpeed: number | null;
};

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
