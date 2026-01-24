import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { registerSchema, loginSchema } from '../types/auth.types';
import { setRefreshTokenCookie, clearRefreshTokenCookie, getRefreshTokenFromCookie } from '../utils/cookies';
import { verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const validatedData = registerSchema.parse(req.body);

      // Register user
      const result = await authService.register(validatedData);

      // Set refresh token in httpOnly cookie
      setRefreshTokenCookie(res, result.refreshToken);

      logger.info(`New user registered: ${result.user.email}`);

      // Return access token in body (NOT refresh token - it's in the cookie)
      res.status(201).json({
        status: 'success',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const validatedData = loginSchema.parse(req.body);

      // Login user
      const result = await authService.login(validatedData);

      // Set refresh token in httpOnly cookie
      setRefreshTokenCookie(res, result.refreshToken);

      logger.info(`User logged in: ${result.user.email}`);

      // Return access token in body (NOT refresh token - it's in the cookie)
      res.status(200).json({
        status: 'success',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      // Try cookie first, fall back to body for backward compatibility during migration
      const refreshToken = getRefreshTokenFromCookie(req.cookies) || req.body.refreshToken;

      if (!refreshToken) {
        throw new AppError('No refresh token provided', 401);
      }

      // Refresh token
      const result = await authService.refreshToken(refreshToken);

      // Set new refresh token in cookie (token rotation)
      setRefreshTokenCookie(res, result.refreshToken);

      res.status(200).json({
        status: 'success',
        data: {
          accessToken: result.accessToken,
          // Note: refreshToken intentionally omitted from response body
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
        });
        return;
      }

      const user = await authService.getCurrentUser(req.user.userId);

      res.status(200).json({
        status: 'success',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Clear the refresh token cookie
      clearRefreshTokenCookie(res);

      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Silent refresh endpoint for restoring auth state on page load.
   * Uses httpOnly cookie to refresh tokens without JavaScript access.
   */
  async silentRefresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = getRefreshTokenFromCookie(req.cookies);

      if (!refreshToken) {
        // No cookie - user is not logged in, this is not an error
        res.status(200).json({
          status: 'success',
          data: null, // Indicates no active session
        });
        return;
      }

      try {
        // Verify the refresh token and get user data
        const decoded = verifyRefreshToken(refreshToken);
        const user = await authService.getCurrentUser(decoded.userId);

        // Get new tokens (rotation)
        const result = await authService.refreshToken(refreshToken);

        // Set new refresh token in cookie
        setRefreshTokenCookie(res, result.refreshToken);

        res.status(200).json({
          status: 'success',
          data: {
            user,
            accessToken: result.accessToken,
          },
        });
      } catch (tokenError) {
        // Invalid/expired token - clear the bad cookie
        clearRefreshTokenCookie(res);
        res.status(200).json({
          status: 'success',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
