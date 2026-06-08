import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Build a per-user key generator that falls back to client IP when the request
 * is unauthenticated. Must be applied AFTER `authenticate` for the per-user
 * keying to take effect; otherwise it degrades to per-IP.
 */
const userOrIpKey = (req: Request): string => {
  const userId = req.user?.userId;
  if (typeof userId === 'number') return `user:${userId}`;
  // express-rate-limit's default key when no generator is supplied is req.ip,
  // which it ensures is populated when `trust proxy` is set (it is in index.ts).
  return `ip:${req.ip ?? 'unknown'}`;
};

/**
 * General rate limiter for normal API usage
 * Allows 100 requests per minute per IP
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 'error',
    message: 'Too many requests. Please try again later.',
  },
});

/**
 * Strict rate limiter for sensitive endpoints like user search
 * Prevents user enumeration attacks by limiting search requests
 * Allows 10 requests per minute per IP
 */
export const sensitiveEndpointRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // 10 requests per minute
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 'error',
    message: 'Too many search requests. Please wait a moment before searching again. Limit: 10 requests per minute.',
  },
  // Skip successful requests - only count failed or rate-limited ones
  // This is optional; remove if you want to count all requests
  skipSuccessfulRequests: false,
});

/**
 * Very strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/register
 * Allows 5 requests per minute per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 5, // 5 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts. Please wait a moment before trying again. Limit: 5 requests per minute.',
  },
});

/**
 * Rate limiter for endpoints that call an external LLM provider.
 * Each call costs real money or burns shared provider quota, so this is
 * keyed per-user (with IP fallback for unauthenticated edge cases).
 *
 * IMPORTANT: This middleware MUST be applied AFTER `authenticate` so that
 * `req.user.userId` is populated; otherwise it silently degrades to per-IP keying.
 *
 * Defaults: 20 requests per hour. Override via env vars:
 *   - AI_RATE_LIMIT_MAX        (integer, default 20)
 *   - AI_RATE_LIMIT_WINDOW_MS  (integer ms, default 3_600_000)
 */
const aiMax = Number(process.env.AI_RATE_LIMIT_MAX) || 20;
const aiWindowMs = Number(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000;

export const aiLimiter = rateLimit({
  windowMs: aiWindowMs,
  max: aiMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: {
    status: 'error',
    message: `Too many AI requests. Please wait before trying again. Limit: ${aiMax} requests per hour.`,
  },
});

/**
 * Rate limiter for backup/restore endpoints. These operations are extremely
 * expensive: `/backup/create` loads the entire user dataset, and
 * `/backup/restore` accepts up to 100 MB and runs a long transaction.
 *
 * Per-user (with IP fallback). MUST be applied AFTER `authenticate`.
 *
 * Defaults: 5 requests per hour. Override via env vars:
 *   - BACKUP_RATE_LIMIT_MAX        (integer, default 5)
 *   - BACKUP_RATE_LIMIT_WINDOW_MS  (integer ms, default 3_600_000)
 */
const backupMax = Number(process.env.BACKUP_RATE_LIMIT_MAX) || 5;
const backupWindowMs = Number(process.env.BACKUP_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000;

export const backupLimiter = rateLimit({
  windowMs: backupWindowMs,
  max: backupMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: {
    status: 'error',
    message: `Too many backup/restore requests. Please wait before trying again. Limit: ${backupMax} requests per hour.`,
  },
});
