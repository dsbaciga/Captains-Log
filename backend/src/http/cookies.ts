import { Response } from 'express';
import { config } from '../config';
import logger from '../config/logger';

const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

/**
 * Sets the refresh token in an httpOnly cookie.
 * This prevents JavaScript from accessing the token, protecting against XSS attacks.
 */
export const setRefreshTokenCookie = (res: Response, token: string): void => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Setting refresh token cookie: secure=${config.cookie.secure}, sameSite=${config.cookie.sameSite}, domain=${config.cookie.domain || '(not set)'}`);
  }

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

const OIDC_STATE_COOKIE_NAME = 'oidcState';

// SameSite must be 'lax' (not the configured default, which may be 'strict'):
// the callback arrives as a top-level redirect from the identity provider, and
// browsers do not send 'strict' cookies on cross-site navigations.
const oidcStateCookieOptions = {
  httpOnly: true,
  secure: config.cookie.secure,
  sameSite: 'lax' as const,
  domain: config.cookie.domain,
  path: '/api/auth/oidc',
};

/**
 * Stores the OIDC state + PKCE verifier for the duration of the login redirect.
 */
export const setOidcStateCookie = (res: Response, value: string): void => {
  res.cookie(OIDC_STATE_COOKIE_NAME, value, {
    ...oidcStateCookieOptions,
    maxAge: 10 * 60 * 1000, // 10 minutes - just long enough to complete the IdP round trip
  });
};

export const getOidcStateCookie = (cookies: Record<string, string>): string | undefined => {
  return cookies[OIDC_STATE_COOKIE_NAME];
};

export const clearOidcStateCookie = (res: Response): void => {
  res.clearCookie(OIDC_STATE_COOKIE_NAME, oidcStateCookieOptions);
};
