/**
 * Mock service implementations for frontend unit tests
 * All service methods are vi.fn() mocks that can be configured per test
 */

import { vi } from 'vitest';
import type { Activity, CreateActivityInput, UpdateActivityInput } from '../../types/activity';
import type { Location, LocationCategory, CreateLocationInput, UpdateLocationInput } from '../../types/location';
import type { Trip, CreateTripInput, UpdateTripInput, TripListResponse, ValidationResult, DuplicateTripInput } from '../../types/trip';
import type { Photo, PhotoAlbum, AlbumWithPhotos, UploadPhotoInput, LinkImmichPhotoInput, UpdatePhotoInput, CreateAlbumInput, UpdateAlbumInput, AddPhotosToAlbumInput, AllAlbumsResponse } from '../../types/photo';
import type { User, UpdateUserSettingsInput } from '../../types/user';
import type { EntityType, EntityLink, EnrichedEntityLink, CreateEntityLinkInput, BulkCreateEntityLinksInput, BulkLinkPhotosInput, DeleteEntityLinkInput, UpdateEntityLinkInput, BulkLinkResult, EntityLinksResponse, TripLinkSummary } from '../../types/entityLink';
import type { GeocodingResult } from '../../services/geocoding.service';
import type { AlbumSuggestion } from '../../services/photo.service';

// ============================================================================
// Activity Service Mock
// ============================================================================

export const mockActivityService = {
  createActivity: vi.fn<(arg1: CreateActivityInput) => Promise<Activity>>(),
  getActivitiesByTrip: vi.fn<(arg1: number) => Promise<Activity[]>>(),
  getActivityById: vi.fn<(arg1: number) => Promise<Activity>>(),
  updateActivity: vi.fn<(arg1: number, arg2: UpdateActivityInput) => Promise<Activity>>(),
  deleteActivity: vi.fn<(arg1: number) => Promise<void>>(),
};

// ============================================================================
// Location Service Mock
// ============================================================================

export const mockLocationService = {
  createLocation: vi.fn<(arg1: CreateLocationInput) => Promise<Location>>(),
  getLocationsByTrip: vi.fn<(arg1: number) => Promise<Location[]>>(),
  getAllVisitedLocations: vi.fn<() => Promise<Location[]>>(),
  getLocationById: vi.fn<(arg1: number) => Promise<Location>>(),
  updateLocation: vi.fn<(arg1: number, arg2: UpdateLocationInput) => Promise<Location>>(),
  deleteLocation: vi.fn<(arg1: number) => Promise<void>>(),
  getCategories: vi.fn<() => Promise<LocationCategory[]>>(),
  createCategory: vi.fn<(arg1: { name: string; icon?: string; color?: string }) => Promise<LocationCategory>>(),
};

// ============================================================================
// Trip Service Mock
// ============================================================================

export const mockTripService = {
  createTrip: vi.fn<(arg1: CreateTripInput) => Promise<Trip>>(),
  getTrips: vi.fn<(arg1?: { status?: string; search?: string; page?: number; limit?: number }) => Promise<TripListResponse>>(),
  getTripById: vi.fn<(arg1: number) => Promise<Trip>>(),
  updateTrip: vi.fn<(arg1: number, arg2: UpdateTripInput) => Promise<Trip>>(),
  deleteTrip: vi.fn<(arg1: number) => Promise<void>>(),
  updateCoverPhoto: vi.fn<(arg1: number, arg2: number | null) => Promise<Trip>>(),
  validateTrip: vi.fn<(arg1: number) => Promise<ValidationResult>>(),
  duplicateTrip: vi.fn<(arg1: number, arg2: DuplicateTripInput) => Promise<Trip>>(),
};

// ============================================================================
// Photo Service Mock
// ============================================================================

export const mockPhotoService = {
  uploadPhoto: vi.fn<(arg1: File, arg2: UploadPhotoInput) => Promise<Photo>>(),
  linkImmichPhoto: vi.fn<(arg1: LinkImmichPhotoInput) => Promise<Photo>>(),
  linkImmichPhotosBatch: vi.fn<(arg1: { tripId: number; assets: Array<{ immichAssetId: string; mediaType?: 'image' | 'video'; duration?: number; caption?: string; takenAt?: string | null; latitude?: number | null; longitude?: number | null }> }) => Promise<{ total: number; successful: number; failed: number; errors: string[]; photoIds: number[] }>>(),
  getPhotosByTrip: vi.fn<(arg1: number, arg2?: { skip?: number; take?: number; sortBy?: string; sortOrder?: string }) => Promise<{ photos: Photo[]; total: number; hasMore: boolean }>>(),
  getUnsortedPhotosByTrip: vi.fn<(arg1: number, arg2?: { skip?: number; take?: number; sortBy?: string; sortOrder?: string }) => Promise<{ photos: Photo[]; total: number; hasMore: boolean }>>(),
  getImmichAssetIdsByTrip: vi.fn<(arg1: number) => Promise<string[]>>(),
  getPhotoById: vi.fn<(arg1: number) => Promise<Photo>>(),
  updatePhoto: vi.fn<(arg1: number, arg2: UpdatePhotoInput) => Promise<Photo>>(),
  deletePhoto: vi.fn<(arg1: number) => Promise<void>>(),
  getAllAlbums: vi.fn<(arg1?: { skip?: number; take?: number; tagIds?: number[] }) => Promise<AllAlbumsResponse>>(),
  createAlbum: vi.fn<(arg1: CreateAlbumInput) => Promise<PhotoAlbum>>(),
  getAlbumsByTrip: vi.fn<(arg1: number, arg2?: { skip?: number; take?: number }) => Promise<{ albums: PhotoAlbum[]; totalAlbums: number; hasMore: boolean; unsortedCount: number; totalCount: number }>>(),
  getAlbumById: vi.fn<(arg1: number, arg2?: { skip?: number; take?: number; sortBy?: string; sortOrder?: string }) => Promise<AlbumWithPhotos>>(),
  updateAlbum: vi.fn<(arg1: number, arg2: UpdateAlbumInput) => Promise<PhotoAlbum>>(),
  deleteAlbum: vi.fn<(arg1: number) => Promise<void>>(),
  addPhotosToAlbum: vi.fn<(arg1: number, arg2: AddPhotosToAlbumInput) => Promise<{ success: boolean; addedCount: number }>>(),
  removePhotoFromAlbum: vi.fn<(arg1: number, arg2: number) => Promise<void>>(),
  getPhotoDateGroupings: vi.fn<(arg1: number, arg2?: string) => Promise<{ groupings: Array<{ date: string; count: number }>; totalWithDates: number; totalWithoutDates: number }>>(),
  getPhotosByDate: vi.fn<(arg1: number, arg2: string, arg3?: string) => Promise<{ photos: Photo[]; date: string; count: number }>>(),
  getAlbumSuggestions: vi.fn<(arg1: number) => Promise<AlbumSuggestion[]>>(),
  acceptAlbumSuggestion: vi.fn<(arg1: number, arg2: { name: string; photoIds: number[] }) => Promise<{ albumId: number }>>(),
};

// ============================================================================
// User Service Mock
// ============================================================================

export const mockUserService = {
  getMe: vi.fn<() => Promise<User>>(),
  updateSettings: vi.fn<(arg1: UpdateUserSettingsInput) => Promise<User>>(),
  updateUsername: vi.fn<(arg1: string) => Promise<{ success: boolean; message: string; username: string }>>(),
  updatePassword: vi.fn<(arg1: string, arg2: string) => Promise<{ success: boolean; message: string }>>(),
  getWeatherSettings: vi.fn<() => Promise<{ weatherApiKeySet: boolean }>>(),
  updateWeatherSettings: vi.fn<(arg1: { weatherApiKey: string | null }) => Promise<{ success: boolean; message: string; weatherApiKeySet: boolean }>>(),
  getAviationstackSettings: vi.fn<() => Promise<{ aviationstackApiKeySet: boolean }>>(),
  updateAviationstackSettings: vi.fn<(arg1: { aviationstackApiKey: string | null }) => Promise<{ success: boolean; message: string; aviationstackApiKeySet: boolean }>>(),
  getOpenrouteserviceSettings: vi.fn<() => Promise<{ openrouteserviceApiKeySet: boolean }>>(),
  updateOpenrouteserviceSettings: vi.fn<(arg1: { openrouteserviceApiKey: string | null }) => Promise<{ success: boolean; message: string; openrouteserviceApiKeySet: boolean }>>(),
};

// ============================================================================
// Entity Link Service Mock
// ============================================================================

export const mockEntityLinkService = {
  createLink: vi.fn<(arg1: number, arg2: CreateEntityLinkInput) => Promise<EntityLink>>(),
  bulkCreateLinks: vi.fn<(arg1: number, arg2: BulkCreateEntityLinksInput) => Promise<BulkLinkResult>>(),
  bulkLinkPhotos: vi.fn<(arg1: number, arg2: BulkLinkPhotosInput) => Promise<BulkLinkResult>>(),
  getLinksFrom: vi.fn<(arg1: number, arg2: EntityType, arg3: number, arg4?: EntityType) => Promise<EnrichedEntityLink[]>>(),
  getLinksTo: vi.fn<(arg1: number, arg2: EntityType, arg3: number, arg4?: EntityType) => Promise<EnrichedEntityLink[]>>(),
  getAllLinksForEntity: vi.fn<(arg1: number, arg2: EntityType, arg3: number) => Promise<EntityLinksResponse>>(),
  getPhotosForEntity: vi.fn<(arg1: number, arg2: EntityType, arg3: number) => Promise<Photo[]>>(),
  getTripLinkSummary: vi.fn<(arg1: number) => Promise<TripLinkSummary>>(),
  getLinksByTargetType: vi.fn<(arg1: number, arg2: EntityType) => Promise<Array<{ sourceType: EntityType; sourceId: number; targetId: number }>>>(),
  deleteLink: vi.fn<(arg1: number, arg2: DeleteEntityLinkInput) => Promise<void>>(),
  deleteLinkById: vi.fn<(arg1: number, arg2: number) => Promise<void>>(),
  updateLink: vi.fn<(arg1: number, arg2: number, arg3: UpdateEntityLinkInput) => Promise<EntityLink>>(),
  deleteAllLinksForEntity: vi.fn<(arg1: number, arg2: EntityType, arg3: number) => Promise<{ deleted: number }>>(),
};

// ============================================================================
// Geocoding Service Mock
// ============================================================================

export const mockGeocodingService = {
  searchPlaces: vi.fn<(arg1: string) => Promise<GeocodingResult[]>>(),
  reverseGeocode: vi.fn<(arg1: number, arg2: number) => Promise<GeocodingResult | null>>(),
};

// ============================================================================
// Auth Service Mock
// ============================================================================

export const mockAuthService = {
  login: vi.fn<(arg1: { email: string; password: string }) => Promise<{ user: User; accessToken: string }>>(),
  register: vi.fn<(arg1: { username: string; email: string; password: string }) => Promise<{ user: User; accessToken: string }>>(),
  logout: vi.fn<() => Promise<void>>(),
  silentRefresh: vi.fn<() => Promise<{ user: User; accessToken: string } | null>>(),
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Reset all mocks to their initial state
 */
export function resetAllMocks(): void {
  Object.values(mockActivityService).forEach(fn => fn.mockReset());
  Object.values(mockLocationService).forEach(fn => fn.mockReset());
  Object.values(mockTripService).forEach(fn => fn.mockReset());
  Object.values(mockPhotoService).forEach(fn => fn.mockReset());
  Object.values(mockUserService).forEach(fn => fn.mockReset());
  Object.values(mockEntityLinkService).forEach(fn => fn.mockReset());
  Object.values(mockGeocodingService).forEach(fn => fn.mockReset());
  Object.values(mockAuthService).forEach(fn => fn.mockReset());
}

/**
 * Clear all mock call history without resetting implementations
 */
export function clearAllMocks(): void {
  Object.values(mockActivityService).forEach(fn => fn.mockClear());
  Object.values(mockLocationService).forEach(fn => fn.mockClear());
  Object.values(mockTripService).forEach(fn => fn.mockClear());
  Object.values(mockPhotoService).forEach(fn => fn.mockClear());
  Object.values(mockUserService).forEach(fn => fn.mockClear());
  Object.values(mockEntityLinkService).forEach(fn => fn.mockClear());
  Object.values(mockGeocodingService).forEach(fn => fn.mockClear());
  Object.values(mockAuthService).forEach(fn => fn.mockClear());
}

/**
 * Setup default resolved values for commonly used service methods
 */
export function setupDefaultMocks(fixtures: {
  activities?: Activity[];
  locations?: Location[];
  locationCategories?: LocationCategory[];
  trips?: Trip[];
  photos?: Photo[];
  user?: User;
}): void {
  if (fixtures.activities !== undefined) {
    mockActivityService.getActivitiesByTrip.mockResolvedValue(fixtures.activities);
  }
  if (fixtures.locations !== undefined) {
    mockLocationService.getLocationsByTrip.mockResolvedValue(fixtures.locations);
  }
  if (fixtures.locationCategories !== undefined) {
    mockLocationService.getCategories.mockResolvedValue(fixtures.locationCategories);
  }
  if (fixtures.user !== undefined) {
    mockUserService.getMe.mockResolvedValue(fixtures.user);
  }
}
