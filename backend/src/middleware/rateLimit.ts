import rateLimit from 'express-rate-limit';

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
