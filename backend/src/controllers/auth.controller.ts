import { Request, Response } from 'express';
import authService from '../services/auth.service';
import { registerSchema, loginSchema, refreshTokenSchema } from '../types/auth.types';
import { asyncHandler } from '../utils/asyncHandler';
import { requireUserId } from '../utils/controllerHelpers';
import { setRefreshTokenCookie, clearRefreshTokenCookie, getRefreshTokenFromCookie } from '../utils/cookies';
import { generateCsrfToken, setCsrfCookie, clearCsrfCookie } from '../utils/csrf';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';
import { blacklistToken, isBlacklisted } from '../services/tokenBlacklist.service';

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
