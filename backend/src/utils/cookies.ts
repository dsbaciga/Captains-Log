import { Response } from 'express';
import { config } from '../config';

const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

/**
 * Sets the refresh token in an httpOnly cookie.
 * This prevents JavaScript from accessing the token, protecting against XSS attacks.
 */
export const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: config.cookie.path,
    maxAge: config.cookie.maxAge,
  });
};

/**
 * Clears the refresh token cookie.
 * Used during logout to ensure the token is removed.
 */
export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: config.cookie.path,
  });
};

/**
 * Extracts the refresh token from cookies.
 * Returns undefined if the cookie is not present.
 */
export const getRefreshTokenFromCookie = (cookies: Record<string, string>): string | undefined => {
  return cookies[REFRESH_TOKEN_COOKIE_NAME];
};
