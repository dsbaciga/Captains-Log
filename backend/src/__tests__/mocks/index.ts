/**
 * Test mocks index - Export all mocks for Travel Life application backend tests
 */

// Prisma mocks
export {
  mockPrismaClient,
  resetPrismaMocks,
  setupPrismaMock,
  setupUserMocks,
  setupTripMocks,
  setupPhotoMocks,
  setupLocationMocks,
  setupNotFoundMocks,
  setupUnauthorizedMocks,
  MockEntityType,
  MockLinkRelationship,
} from './prisma';
export type { MockPrismaClient } from './prisma';

// External API mocks - Nominatim
export {
  mockNominatimService,
  mockNominatimSearchResults,
  setupNominatimMock,
  setupNominatimNoResults,
  setupNominatimError,
} from './external-apis';
export type { NominatimSearchResult, NominatimReverseResult } from './external-apis';

// External API mocks - OpenRouteService
export {
  mockOpenRouteService,
  mockRouteResult,
  setupRoutingMock,
  setupRoutingFallback,
} from './external-apis';
export type { RouteResult } from './external-apis';

// External API mocks - Immich
export {
  mockImmichService,
  mockImmichAssets,
  mockImmichAlbums,
  setupImmichMock,
  setupImmichNoConnection,
} from './external-apis';
export type { ImmichAsset, ImmichAlbum } from './external-apis';

// External API mocks - Weather
export {
  mockWeatherService,
  mockWeatherData,
  setupWeatherMock,
  setupWeatherUnavailable,
} from './external-apis';
export type { WeatherData } from './external-apis';

// External API mocks - Flight
export {
  mockFlightService,
  mockFlightData,
  setupFlightMock,
  setupFlightNotFound,
} from './external-apis';
export type { FlightData } from './external-apis';

// Reset all mocks
export { resetExternalApiMocks } from './external-apis';

/**
 * Reset all mocks (Prisma + external APIs)
 * Call this in beforeEach() for clean test state
 */
export const resetAllMocks = () => {
  const { resetPrismaMocks } = require('./prisma');
  const { resetExternalApiMocks } = require('./external-apis');
  resetPrismaMocks();
  resetExternalApiMocks();
};
