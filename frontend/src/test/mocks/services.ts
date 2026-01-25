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

// ============================================================================
// Activity Service Mock
// ============================================================================

export const mockActivityService = {
  createActivity: vi.fn<[CreateActivityInput], Promise<Activity>>(),
  getActivitiesByTrip: vi.fn<[number], Promise<Activity[]>>(),
  getActivityById: vi.fn<[number], Promise<Activity>>(),
  updateActivity: vi.fn<[number, UpdateActivityInput], Promise<Activity>>(),
  deleteActivity: vi.fn<[number], Promise<void>>(),
};

// ============================================================================
// Location Service Mock
// ============================================================================

export const mockLocationService = {
  createLocation: vi.fn<[CreateLocationInput], Promise<Location>>(),
  getLocationsByTrip: vi.fn<[number], Promise<Location[]>>(),
  getAllVisitedLocations: vi.fn<[], Promise<Location[]>>(),
  getLocationById: vi.fn<[number], Promise<Location>>(),
  updateLocation: vi.fn<[number, UpdateLocationInput], Promise<Location>>(),
  deleteLocation: vi.fn<[number], Promise<void>>(),
  getCategories: vi.fn<[], Promise<LocationCategory[]>>(),
  createCategory: vi.fn<[{ name: string; icon?: string; color?: string }], Promise<LocationCategory>>(),
};

// ============================================================================
// Trip Service Mock
// ============================================================================

export const mockTripService = {
  createTrip: vi.fn<[CreateTripInput], Promise<Trip>>(),
  getTrips: vi.fn<[{ status?: string; search?: string; page?: number; limit?: number }?], Promise<TripListResponse>>(),
  getTripById: vi.fn<[number], Promise<Trip>>(),
  updateTrip: vi.fn<[number, UpdateTripInput], Promise<Trip>>(),
  deleteTrip: vi.fn<[number], Promise<void>>(),
  updateCoverPhoto: vi.fn<[number, number | null], Promise<Trip>>(),
  validateTrip: vi.fn<[number], Promise<ValidationResult>>(),
  duplicateTrip: vi.fn<[number, DuplicateTripInput], Promise<Trip>>(),
};

// ============================================================================
// Photo Service Mock
// ============================================================================

export const mockPhotoService = {
  uploadPhoto: vi.fn<[File, UploadPhotoInput], Promise<Photo>>(),
  linkImmichPhoto: vi.fn<[LinkImmichPhotoInput], Promise<Photo>>(),
  linkImmichPhotosBatch: vi.fn<[{ tripId: number; assets: Array<{ immichAssetId: string; mediaType?: 'image' | 'video'; duration?: number; caption?: string; takenAt?: string | null; latitude?: number | null; longitude?: number | null }> }], Promise<{ total: number; successful: number; failed: number; errors: string[]; photoIds: number[] }>>(),
  getPhotosByTrip: vi.fn<[number, { skip?: number; take?: number; sortBy?: string; sortOrder?: string }?], Promise<{ photos: Photo[]; total: number; hasMore: boolean }>>(),
  getUnsortedPhotosByTrip: vi.fn<[number, { skip?: number; take?: number; sortBy?: string; sortOrder?: string }?], Promise<{ photos: Photo[]; total: number; hasMore: boolean }>>(),
  getImmichAssetIdsByTrip: vi.fn<[number], Promise<string[]>>(),
  getPhotoById: vi.fn<[number], Promise<Photo>>(),
  updatePhoto: vi.fn<[number, UpdatePhotoInput], Promise<Photo>>(),
  deletePhoto: vi.fn<[number], Promise<void>>(),
  getAllAlbums: vi.fn<[{ skip?: number; take?: number; tagIds?: number[] }?], Promise<AllAlbumsResponse>>(),
  createAlbum: vi.fn<[CreateAlbumInput], Promise<PhotoAlbum>>(),
  getAlbumsByTrip: vi.fn<[number, { skip?: number; take?: number }?], Promise<{ albums: PhotoAlbum[]; totalAlbums: number; hasMore: boolean; unsortedCount: number; totalCount: number }>>(),
  getAlbumById: vi.fn<[number, { skip?: number; take?: number; sortBy?: string; sortOrder?: string }?], Promise<AlbumWithPhotos>>(),
  updateAlbum: vi.fn<[number, UpdateAlbumInput], Promise<PhotoAlbum>>(),
  deleteAlbum: vi.fn<[number], Promise<void>>(),
  addPhotosToAlbum: vi.fn<[number, AddPhotosToAlbumInput], Promise<{ success: boolean; addedCount: number }>>(),
  removePhotoFromAlbum: vi.fn<[number, number], Promise<void>>(),
  getPhotoDateGroupings: vi.fn<[number, string?], Promise<{ groupings: Array<{ date: string; count: number }>; totalWithDates: number; totalWithoutDates: number }>>(),
  getPhotosByDate: vi.fn<[number, string, string?], Promise<{ photos: Photo[]; date: string; count: number }>>(),
  getAlbumSuggestions: vi.fn<[number], Promise<Array<{ name: string; photoIds: number[]; type: 'date' | 'location'; confidence: number; metadata: { date?: string; locationName?: string; locationId?: number } }>>>(),
  acceptAlbumSuggestion: vi.fn<[number, { name: string; photoIds: number[] }], Promise<{ albumId: number }>>(),
};

// ============================================================================
// User Service Mock
// ============================================================================

export const mockUserService = {
  getMe: vi.fn<[], Promise<User>>(),
  updateSettings: vi.fn<[UpdateUserSettingsInput], Promise<User>>(),
  updateUsername: vi.fn<[string], Promise<{ success: boolean; message: string; username: string }>>(),
  updatePassword: vi.fn<[string, string], Promise<{ success: boolean; message: string }>>(),
  getWeatherSettings: vi.fn<[], Promise<{ weatherApiKeySet: boolean }>>(),
  updateWeatherSettings: vi.fn<[{ weatherApiKey: string | null }], Promise<{ success: boolean; message: string; weatherApiKeySet: boolean }>>(),
  getAviationstackSettings: vi.fn<[], Promise<{ aviationstackApiKeySet: boolean }>>(),
  updateAviationstackSettings: vi.fn<[{ aviationstackApiKey: string | null }], Promise<{ success: boolean; message: string; aviationstackApiKeySet: boolean }>>(),
  getOpenrouteserviceSettings: vi.fn<[], Promise<{ openrouteserviceApiKeySet: boolean }>>(),
  updateOpenrouteserviceSettings: vi.fn<[{ openrouteserviceApiKey: string | null }], Promise<{ success: boolean; message: string; openrouteserviceApiKeySet: boolean }>>(),
};

// ============================================================================
// Entity Link Service Mock
// ============================================================================

export const mockEntityLinkService = {
  createLink: vi.fn<[number, CreateEntityLinkInput], Promise<EntityLink>>(),
  bulkCreateLinks: vi.fn<[number, BulkCreateEntityLinksInput], Promise<BulkLinkResult>>(),
  bulkLinkPhotos: vi.fn<[number, BulkLinkPhotosInput], Promise<BulkLinkResult>>(),
  getLinksFrom: vi.fn<[number, EntityType, number, EntityType?], Promise<EnrichedEntityLink[]>>(),
  getLinksTo: vi.fn<[number, EntityType, number, EntityType?], Promise<EnrichedEntityLink[]>>(),
  getAllLinksForEntity: vi.fn<[number, EntityType, number], Promise<EntityLinksResponse>>(),
  getPhotosForEntity: vi.fn<[number, EntityType, number], Promise<Photo[]>>(),
  getTripLinkSummary: vi.fn<[number], Promise<TripLinkSummary>>(),
  getLinksByTargetType: vi.fn<[number, EntityType], Promise<Array<{ sourceType: EntityType; sourceId: number; targetId: number }>>>(),
  deleteLink: vi.fn<[number, DeleteEntityLinkInput], Promise<void>>(),
  deleteLinkById: vi.fn<[number, number], Promise<void>>(),
  updateLink: vi.fn<[number, number, UpdateEntityLinkInput], Promise<EntityLink>>(),
  deleteAllLinksForEntity: vi.fn<[number, EntityType, number], Promise<{ deleted: number }>>(),
};

// ============================================================================
// Geocoding Service Mock
// ============================================================================

export const mockGeocodingService = {
  searchPlaces: vi.fn<[string], Promise<GeocodingResult[]>>(),
  reverseGeocode: vi.fn<[number, number], Promise<GeocodingResult | null>>(),
};

// ============================================================================
// Auth Service Mock
// ============================================================================

export const mockAuthService = {
  login: vi.fn<[{ email: string; password: string }], Promise<{ user: User; accessToken: string }>>(),
  register: vi.fn<[{ username: string; email: string; password: string }], Promise<{ user: User; accessToken: string }>>(),
  logout: vi.fn<[], Promise<void>>(),
  silentRefresh: vi.fn<[], Promise<{ user: User; accessToken: string } | null>>(),
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
