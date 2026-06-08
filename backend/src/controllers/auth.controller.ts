import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import authService from '../services/auth.service';
import { registerSchema, loginSchema, refreshTokenSchema } from '../types/auth.types';
import { asyncHandler } from '../http/asyncHandler';
import { requireUserId } from '../auth/controllerHelpers';
import { setRefreshTokenCookie, clearRefreshTokenCookie, getRefreshTokenFromCookie } from '../http/cookies';
import { generateCsrfToken, setCsrfCookie, clearCsrfCookie } from '../security/csrf';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';
import { blacklistToken, isBlacklisted } from '../services/tokenBlacklist.service';

/**
 * Extract the bearer access token from the Authorization header.
 * Mirrors the extraction logic in the authenticate middleware.
 * Returns undefined if not present or malformed.
 */
const getAccessTokenFromHeader = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return undefined;
  }
  const token = authHeader.substring(7).trim();
  return token.length > 0 ? token : undefined;
};

/**
 * Compute remaining TTL (in milliseconds) for a JWT based on its `exp` claim.
 * Returns null if the token cannot be decoded or has no exp claim.
 * Returns 0 if the token has already expired (caller may skip blacklisting).
 */
const getRemainingTtlMs = (token: string): number | null => {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== 'object' || !('exp' in decoded)) return null;
  const { exp } = decoded;
  if (typeof exp !== 'number') return null;
  const remainingMs = exp * 1000 - Date.now();
  return remainingMs > 0 ? remainingMs : 0;
};

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const validatedData = registerSchema.parse(req.body);
    const result = await authService.register(validatedData);

    // Set refresh token in httpOnly cookie
    setRefreshTokenCookie(res, result.refreshToken);

    // Set CSRF token in regular cookie for defense-in-depth
    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    logger.info(`New user registered: ${result.user.email}`);

    // Return access token in body (NOT refresh token - it's in the cookie)
    res.status(201).json({
      status: 'success',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.login(validatedData);

    // Set refresh token in httpOnly cookie
    setRefreshTokenCookie(res, result.refreshToken);

    // Set CSRF token in regular cookie for defense-in-depth
    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    logger.info(`User logged in: ${result.user.email}`);

    // Return access token in body (NOT refresh token - it's in the cookie)
    res.status(200).json({
      status: 'success',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  }),

  refreshToken: asyncHandler(async (req: Request, res: Response) => {
    // Try cookie first, fall back to body for backward compatibility during migration
    const refreshToken = getRefreshTokenFromCookie(req.cookies) || refreshTokenSchema.parse(req.body).refreshToken;

    if (!refreshToken) {
      throw new AppError('No refresh token provided', 401);
    }

    // Check if token has been blacklisted (e.g., user logged out)
    if (isBlacklisted(refreshToken)) {
      clearRefreshTokenCookie(res);
      clearCsrfCookie(res);
      throw new AppError('Token has been revoked', 401);
    }

    const result = await authService.refreshToken(refreshToken);

    // Set new refresh token in cookie (token rotation)
    setRefreshTokenCookie(res, result.refreshToken);

    // Rotate CSRF token on refresh for additional security
    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    res.status(200).json({
      status: 'success',
      data: {
        accessToken: result.accessToken,
      },
    });
  }),

  getCurrentUser: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const user = await authService.getCurrentUser(userId);

    res.status(200).json({
      status: 'success',
      data: user,
    });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    // Blacklist the refresh token to enable immediate revocation
    const refreshToken = getRefreshTokenFromCookie(req.cookies);
    if (refreshToken) {
      blacklistToken(refreshToken);
      logger.debug('Refresh token blacklisted on logout');
    }

    // Also blacklist the access token so a stolen access token cannot be reused
    // until its natural expiry (~15 min). Wrapped in try/catch because a malformed
    // or already-expired access token must not fail the logout.
    const accessToken = getAccessTokenFromHeader(req);
    if (accessToken) {
      try {
        const remainingMs = getRemainingTtlMs(accessToken);
        if (remainingMs === null) {
          logger.warn('Could not decode access token on logout; skipping access-token blacklist');
        } else if (remainingMs > 0) {
          blacklistToken(accessToken, remainingMs);
          logger.debug('Access token blacklisted on logout');
        }
        // remainingMs === 0: token already expired, no need to blacklist
      } catch (err) {
        logger.warn('Failed to blacklist access token on logout; continuing with logout', { error: err });
      }
    }

    // Clear the refresh token cookie
    clearRefreshTokenCookie(res);

    // Clear the CSRF token cookie
    clearCsrfCookie(res);

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  }),

  /**
   * Silent refresh endpoint for restoring auth state on page load.
   * Uses httpOnly cookie to refresh tokens without JavaScript access.
   */
  silentRefresh: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = getRefreshTokenFromCookie(req.cookies);

    if (!refreshToken) {
      // No cookie - user is not logged in, this is not an error
      res.status(200).json({
        status: 'success',
        data: null, // Indicates no active session
      });
      return;
    }

    // Check if token has been blacklisted (e.g., user logged out)
    if (isBlacklisted(refreshToken)) {
      clearRefreshTokenCookie(res);
      clearCsrfCookie(res);
      res.status(200).json({
        status: 'success',
        data: null, // Token was revoked, treat as no session
      });
      return;
    }

    try {
      // Get new tokens and user data (single verification in authService.refreshToken)
      const result = await authService.refreshToken(refreshToken);

      // Set new refresh token in cookie
      setRefreshTokenCookie(res, result.refreshToken);

      // Set CSRF token in regular cookie for defense-in-depth
      const csrfToken = generateCsrfToken();
      setCsrfCookie(res, csrfToken);

      res.status(200).json({
        status: 'success',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch {
      // Invalid/expired token - clear the bad cookies
      clearRefreshTokenCookie(res);
      clearCsrfCookie(res);
      res.status(200).json({
        status: 'success',
        data: null,
      });
    }
  }),
};
