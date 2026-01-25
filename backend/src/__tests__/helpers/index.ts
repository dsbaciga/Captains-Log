/**
 * Test helpers index - Export all helpers for Travel Life application backend tests
 */

// Auth helpers
export {
  generateTestAccessToken,
  generateTestRefreshToken,
  generateExpiredAccessToken,
  generateInvalidToken,
  generateMalformedToken,
  decodeTestToken,
  createAuthHeader,
  createAuthenticatedUser,
  createMockAuthenticatedRequest,
  createMockUnauthenticatedRequest,
  authTestScenarios,
  getAuthTestCases,
  createOwnershipTestCases,
} from './auth';
export type {
  MockAuthenticatedRequest,
  MockUnauthenticatedRequest,
} from './auth';

// Request helpers
export {
  createMockRequest,
  createMockResponse,
  createMockNext,
  createMockControllerArgs,
  createAuthenticatedControllerArgs,
  createUnauthenticatedControllerArgs,
  createMockFile,
  createMockPhotoFile,
  createMockVideoFile,
  expectSuccessResponse,
  expectErrorResponse,
  expectNextCalledWithError,
  expectNoResponseSent,
  requestScenarios,
  createTripScopedRequest,
} from './requests';
export type {
  AuthenticatedRequest,
  MockResponse,
  MockNextFunction,
  MulterFile,
} from './requests';
