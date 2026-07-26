/**
 * Auth test helpers for Travel Life application backend tests
 *
 * Provides utilities for creating test tokens and mocking authenticated requests.
 */

import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { testUsers, TestUser } from '../fixtures/users';
import { JwtPayload } from '../../types/auth.types';

// Test secrets (matching setup.ts)
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
const TEST_JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

/**
 * Generate a valid JWT access token for testing
 */
export const generateTestAccessToken = (
  user: TestUser | { id: number; email: string } = testUsers.user1,
  options: { expiresIn?: string } = {}
): string => {
  const payload: JwtPayload = {
    id: user.id,
    userId: user.id,
    email: user.email,
  };

  const signOptions: SignOptions = {
    expiresIn: options.expiresIn || '15m',
  };

  return jwt.sign(payload, TEST_JWT_SECRET, signOptions);
};

/**
 * Generate a valid JWT refresh token for testing
 */
export const generateTestRefreshToken = (
  user: TestUser | { id: number; email: string } = testUsers.user1,
  options: { expiresIn?: string } = {}
): string => {
  const payload: JwtPayload = {
    id: user.id,
    userId: user.id,
    email: user.email,
  };

  const signOptions: SignOptions = {
    expiresIn: options.expiresIn || '7d',
  };

  return jwt.sign(payload, TEST_JWT_REFRESH_SECRET, signOptions);
};

/**
 * Generate an expired access token for testing token refresh flows
 */
export const generateExpiredAccessToken = (
  user: TestUser | { id: number; email: string } = testUsers.user1
): string => {
  const payload: JwtPayload = {
    id: user.id,
    userId: user.id,
    email: user.email,
  };

  // Create a token that expires in the past by setting expiresIn to 0 and iat in the past
  const signOptions: SignOptions = {
    expiresIn: '1ms',
  };

  return jwt.sign(payload, TEST_JWT_SECRET, signOptions);
};

/**
 * Generate an invalid token (signed with wrong secret)
 */
export const generateInvalidToken = (
  user: TestUser | { id: number; email: string } = testUsers.user1
): string => {
  const payload: JwtPayload = {
    id: user.id,
    userId: user.id,
    email: user.email,
  };

  const signOptions: SignOptions = {
    expiresIn: '15m',
  };

  return jwt.sign(payload, 'wrong-secret', signOptions);
};

/**
 * Generate a malformed token (not a valid JWT)
 */
export const generateMalformedToken = (): string => {
  return 'not.a.valid.jwt.token';
};

/**
 * Decode a token without verification (for testing)
 */
export const decodeTestToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
};

/**
 * Create an Authorization header value
 */
export const createAuthHeader = (token: string): string => {
  return `Bearer ${token}`;
};

/**
 * Create an authenticated request user object (mimics req.user after auth middleware)
 */
export const createAuthenticatedUser = (
  user: TestUser | { id: number; email: string } = testUsers.user1
): JwtPayload => ({
  id: user.id,
  userId: user.id,
  email: user.email,
});

/**
 * Mock the authenticated request object with user attached
 */
export interface MockAuthenticatedRequest {
  user: JwtPayload;
  headers: {
    authorization: string;
  };
}

export const createMockAuthenticatedRequest = (
  user: TestUser | { id: number; email: string } = testUsers.user1
): MockAuthenticatedRequest => {
  const token = generateTestAccessToken(user);
  return {
    user: createAuthenticatedUser(user),
    headers: {
      authorization: createAuthHeader(token),
    },
  };
};

/**
 * Mock unauthenticated request object
 */
export interface MockUnauthenticatedRequest {
  user: undefined;
  headers: Record<string, string>;
}

export const createMockUnauthenticatedRequest = (): MockUnauthenticatedRequest => ({
  user: undefined,
  headers: {},
});

/**
 * Auth test scenarios for comprehensive testing
 */
export const authTestScenarios = {
  validAuth: {
    description: 'Valid authentication',
    getToken: () => generateTestAccessToken(testUsers.user1),
    expectedUserId: testUsers.user1.id,
    shouldPass: true,
  },
  expiredToken: {
    description: 'Expired access token',
    getToken: () => generateExpiredAccessToken(testUsers.user1),
    expectedUserId: null,
    shouldPass: false,
  },
  invalidToken: {
    description: 'Invalid token signature',
    getToken: () => generateInvalidToken(testUsers.user1),
    expectedUserId: null,
    shouldPass: false,
  },
  malformedToken: {
    description: 'Malformed token',
    getToken: () => generateMalformedToken(),
    expectedUserId: null,
    shouldPass: false,
  },
  noToken: {
    description: 'No authorization header',
    getToken: () => null,
    expectedUserId: null,
    shouldPass: false,
  },
  emptyToken: {
    description: 'Empty authorization header',
    getToken: () => '',
    expectedUserId: null,
    shouldPass: false,
  },
  bearerOnly: {
    description: 'Bearer prefix without token',
    getToken: () => 'Bearer ',
    expectedUserId: null,
    shouldPass: false,
  },
};

/**
 * Get all auth test scenarios as an array for parameterized tests
 */
export const getAuthTestCases = () => {
  return Object.entries(authTestScenarios).map(([name, scenario]) => ({
    name,
    ...scenario,
  }));
};

/**
 * Helper to test authorization (user owns resource)
 */
export const createOwnershipTestCases = (resourceOwnerId: number) => ({
  owner: {
    description: 'Resource owner',
    userId: resourceOwnerId,
    shouldHaveAccess: true,
  },
  otherUser: {
    description: 'Different user (not owner)',
    userId: resourceOwnerId + 1,
    shouldHaveAccess: false,
  },
});
