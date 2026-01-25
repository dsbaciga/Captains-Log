/**
 * Test fixtures index - Export all fixtures for Travel Life application backend tests
 */

// User fixtures
export {
  testUsers,
  createTestUser,
  createAuthUser,
  validRegistrationInput,
  validLoginInput,
  invalidUserInputs,
} from './users';
export type { TestUser } from './users';

// Trip fixtures
export {
  TripStatus,
  PrivacyLevel,
  testTrips,
  createTestTrip,
  validCreateTripInput,
  minimalCreateTripInput,
  validUpdateTripInput,
  invalidTripInputs,
  getTripsForUser,
  getTripsByStatus,
} from './trips';
export type { TestTrip, TripStatusType, PrivacyLevelType } from './trips';

// Photo fixtures
export {
  PhotoSource,
  MediaType,
  testPhotos,
  testPhotoAlbums,
  testPhotoAlbumAssignments,
  createTestPhoto,
  createTestPhotoAlbum,
  validUploadPhotoInput,
  validLinkImmichPhotoInput,
  validUpdatePhotoInput,
  validCreateAlbumInput,
  validUpdateAlbumInput,
  invalidPhotoInputs,
  invalidAlbumInputs,
  getPhotosForTrip,
  getAlbumsForTrip,
} from './photos';
export type {
  TestPhoto,
  TestPhotoAlbum,
  TestPhotoAlbumAssignment,
  PhotoSourceType,
  MediaTypeType,
} from './photos';
