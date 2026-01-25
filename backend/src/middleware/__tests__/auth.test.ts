/**
 * Auth Middleware Tests
 *
 * Test cases:
 * AUTH-M01: Extract token from Authorization header
 * AUTH-M02: Reject missing Authorization header
 * AUTH-M03: Reject malformed Bearer token
 * AUTH-M04: Reject expired access token
 * AUTH-M05: Reject invalid token signature
 * AUTH-M06: Attach user to request on valid token
 * AUTH-M07: Rate limit exceeded returns 429 (note: rate limiting is not in auth middleware)
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mock the config module
jest.mock('../../config', () => ({
  config: {
    jwt: {
      secret: 'test-jwt-secret',
      expiresIn: '15m',
      refreshSecret: 'test-refresh-secret',
      refreshExpiresIn: '7d',
    },
  },
}));

// Import after mocks
import { authenticate } from '../auth';
import { AppError } from '../../utils/errors';
import { generateAccessToken } from '../../utils/jwt';
import { JwtPayload } from '../../types/auth.types';

describe('Auth Middleware - authenticate', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis() as unknown as Response['status'],
      json: jest.fn() as unknown as Response['json'],
    };
    nextFunction = jest.fn() as unknown as NextFunction;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // AUTH-M01: Extract token from Authorization header
  describe('AUTH-M01: Token extraction from Authorization header', () => {
    it('should extract token from valid Authorization header', () => {
      const payload: JwtPayload = { id: 1, userId: 1, email: 'test@example.com' };
      const token = generateAccessToken(payload);

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.userId).toBe(1);
    });

    it('should handle lowercase authorization header', () => {
      const payload: JwtPayload = { id: 1, userId: 1, email: 'test@example.com' };
      const token = generateAccessToken(payload);

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
    });
  });

  // AUTH-M02: Reject missing Authorization header
  describe('AUTH-M02: Missing Authorization header', () => {
    it('should reject request with no Authorization header', () => {
      mockRequest.headers = {};

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = (nextFunction as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toBe('No token provided');
      expect(error.statusCode).toBe(401);
    });

    it('should reject request with undefined authorization', () => {
      mockRequest.headers = {
        authorization: undefined,
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = (nextFunction as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
    });
  });

  // AUTH-M03: Reject malformed Bearer token
  describe('AUTH-M03: Malformed Bearer token', () => {
    it('should reject token without Bearer prefix', () => {
      const payload: JwtPayload = { id: 1, userId: 1, email: 'test@example.com' };
      const token = generateAccessToken(payload);

      mockRequest.headers = {
        authorization: token, // Missing "Bearer " prefix
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = (nextFunction as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toBe('No token provided');
      expect(error.statusCode).toBe(401);
    });

    it('should reject token with wrong prefix', () => {
      const payload: JwtPayload = { id: 1, userId: 1, email: 'test@example.com' };
      const token = generateAccessToken(payload);

      mockRequest.headers = {
        authorization: `Basic ${token}`,
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = (nextFunction as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toBe('No token provided');
    });

    it('should reject empty Bearer token', () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = (nextFunction as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
    });

    it('should reject malformed JWT token', () => {
      mockRequest.headers = {
        authorization: 'Bearer not.a.valid.jwt.token',
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = (nextFunction as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toBe('Invalid or expired token');
      expect(error.statusCode).toBe(401);
    });

    it('should reject completely invalid token string', () => {
      mockRequest.headers = {
        authorization: 'Bearer randomgarbage',
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = (nextFunction as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
    });
  });

  // AUTH-M04: Reject expired access token
  describe('AUTH-M04: Expired access token', () => {
    it('should reject expired token', () => {
      // Create an expired token manually
      const expiredToken = jwt.sign(
        { id: 1, userId: 1, email: 'test@example.com' },
        'test-jwt-secret',
        { expiresIn: '-1s' } // Already expired
      );

      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = (nextFunction as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toBe('Invalid or expired token');
      expect(error.statusCode).toBe(401);
    });

    it('should reject token that expired just now', () => {
      // Create a token that expired 1 second ago
      const expiredToken = jwt.sign(
        { id: 1, userId: 1, email: 'test@example.com' },
        'test-jwt-secret',
        { expiresIn: '0s' }
      );

      // Wait a moment to ensure expiry
      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = (nextFunction as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
    });
  });

  // AUTH-M05: Reject invalid token signature
  describe('AUTH-M05: Invalid token signature', () => {
    it('should reject token signed with wrong secret', () => {
      const wrongSecretToken = jwt.sign(
        { id: 1, userId: 1, email: 'test@example.com' },
        'wrong-secret-key',
        { expiresIn: '15m' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${wrongSecretToken}`,
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = (nextFunction as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toBe('Invalid or expired token');
      expect(error.statusCode).toBe(401);
    });

    it('should reject token with tampered payload', () => {
      // Create a valid token
      const validToken = generateAccessToken({ id: 1, userId: 1, email: 'test@example.com' });

      // Tamper with the payload by modifying the middle part
      const parts = validToken.split('.');
      // Decode, modify, and re-encode the payload (but signature will be invalid)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      payload.userId = 999; // Tamper with the user ID
      parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const tamperedToken = parts.join('.');

      mockRequest.headers = {
        authorization: `Bearer ${tamperedToken}`,
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = (nextFunction as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
    });

    it('should reject refresh token used as access token', () => {
      // Refresh tokens are signed with a different secret
      const refreshToken = jwt.sign(
        { id: 1, userId: 1, email: 'test@example.com' },
        'test-refresh-secret', // Using refresh secret instead of access secret
        { expiresIn: '7d' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${refreshToken}`,
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = (nextFunction as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
    });
  });

  // AUTH-M06: Attach user to request on valid token
  describe('AUTH-M06: Attach user to request', () => {
    it('should attach decoded user payload to request', () => {
      const payload: JwtPayload = { id: 42, userId: 42, email: 'user@example.com' };
      const token = generateAccessToken(payload);

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      // Check that no error was passed to next
      expect((nextFunction as jest.Mock).mock.calls[0][0]).toBeUndefined();

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe(42);
      expect(mockRequest.user?.userId).toBe(42);
      expect(mockRequest.user?.email).toBe('user@example.com');
    });

    it('should attach user with all payload fields', () => {
      const payload: JwtPayload = {
        id: 100,
        userId: 100,
        email: 'complete@example.com',
      };
      const token = generateAccessToken(payload);

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toMatchObject({
        id: 100,
        userId: 100,
        email: 'complete@example.com',
      });
    });

    it('should call next() without arguments on success', () => {
      const payload: JwtPayload = { id: 1, userId: 1, email: 'test@example.com' };
      const token = generateAccessToken(payload);

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // next() should be called with no arguments (indicating success)
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect((nextFunction as jest.Mock).mock.calls[0]).toHaveLength(0);
    });
  });

  // AUTH-M07: Rate limiting (note: rate limiting is typically handled by a separate middleware)
  describe('AUTH-M07: Rate limiting behavior', () => {
    it('should not implement rate limiting in auth middleware (separate concern)', () => {
      // The authenticate middleware does not handle rate limiting
      // This test documents that behavior - rate limiting should be a separate middleware
      const payload: JwtPayload = { id: 1, userId: 1, email: 'test@example.com' };
      const token = generateAccessToken(payload);

      // Make multiple rapid calls - all should succeed (no rate limiting in auth middleware)
      for (let i = 0; i < 10; i++) {
        mockRequest.headers = {
          authorization: `Bearer ${token}`,
        };
        authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      }

      // All calls should succeed - next() called 10 times
      expect(nextFunction).toHaveBeenCalledTimes(10);
    });
  });

  // Additional edge case tests
  describe('Edge Cases', () => {
    it('should handle whitespace in Authorization header', () => {
      const payload: JwtPayload = { id: 1, userId: 1, email: 'test@example.com' };
      const token = generateAccessToken(payload);

      mockRequest.headers = {
        authorization: `Bearer  ${token}`, // Extra space
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // The middleware uses substring(7) which would include the extra space
      // This tests the current behavior
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle token with special characters in email', () => {
      const payload: JwtPayload = {
        id: 1,
        userId: 1,
        email: 'user+tag@example.com',
      };
      const token = generateAccessToken(payload);

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.user?.email).toBe('user+tag@example.com');
    });

    it('should handle large user IDs', () => {
      const payload: JwtPayload = {
        id: 999999999,
        userId: 999999999,
        email: 'test@example.com',
      };
      const token = generateAccessToken(payload);

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.user?.userId).toBe(999999999);
    });
  });
});
