import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generates a cryptographically secure CSRF token.
 */
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Sets the CSRF token in a regular (non-httpOnly) cookie.
 * This allows JavaScript to read the token and send it in request headers.
 * The security comes from verifying the header matches the cookie.
 */
export const setCsrfCookie = (res: Response, token: string): void => {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: '/',
    maxAge: config.cookie.maxAge,
  });
};

/**
 * Clears the CSRF token cookie.
 * Used during logout to ensure the token is removed.
 */
export const clearCsrfCookie = (res: Response): void => {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: '/',
  });
};

/**
 * Middleware to validate CSRF token.
 * Compares the token in the cookie with the token in the request header.
 * Skips validation for safe HTTP methods (GET, HEAD, OPTIONS).
 * Skips validation for auth routes (login/register/refresh bootstrap the CSRF token).
 * Skips validation for public invitation routes (the invitation token provides equivalent protection).
 */
export const validateCsrf = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF validation for GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF validation for auth routes (these bootstrap the CSRF token)
  // Login, register, refresh, and silent-refresh set the CSRF cookie
  if (req.path.startsWith('/auth/')) {
    return next();
  }

  // Skip CSRF validation for public user invitation routes
  // These are accessed by unauthenticated users who don't have CSRF tokens
  // Security is provided by:
  // 1. The invitation token itself (cryptographically random, one-time use)
  // 2. Rate limiting (20 requests per 15 minutes)
  // 3. CORS configuration (restricts origins)
  // Use exact path matching to prevent bypass attacks (e.g., /user-invitations/accept-malicious)
  if (req.path === '/user-invitations/accept' ||
      /^\/user-invitations\/decline\/[a-f0-9]{64}$/.test(req.path)) {
    return next();
  }

  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken || !headerToken || typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
    res.status(403).json({
      status: 'error',
      message: 'Invalid CSRF token',
    });
    return;
  }

  const cookieBuffer = Buffer.from(cookieToken, 'utf8');
  const headerBuffer = Buffer.from(headerToken, 'utf8');

  if (cookieBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    res.status(403).json({
      status: 'error',
      message: 'Invalid CSRF token',
    });
    return;
  }

  next();
};
