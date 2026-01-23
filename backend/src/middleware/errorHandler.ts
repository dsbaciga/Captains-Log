import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../config/logger';
import { AppError as UtilsAppError } from '../utils/errors';

// Re-export AppError from utils/errors for backwards compatibility
export { AppError } from '../utils/errors';

// Sensitive field names that should never be logged
const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'api_key',
  'secret',
  'authorization',
  'credential',
  'credentials',
]);

// Sanitize an object by redacting sensitive fields
const sanitizeForLogging = (obj: Record<string, any> | undefined): Record<string, any> | undefined => {
  if (!obj || typeof obj !== 'object') return undefined;

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token') || lowerKey.includes('apikey')) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Enhanced logging with error details (sensitive data redacted)
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    params: req.params,
    // Only log sanitized body in development for debugging
    body: process.env.NODE_ENV === 'development' ? sanitizeForLogging(req.body) : undefined,
    // Prisma errors have a 'code' property
    code: (err as any).code,
    meta: (err as any).meta,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: err.errors,
    });
  }

  // Prisma errors
  if ((err as any).code) {
    const prismaError = err as any;

    // P2002: Unique constraint violation
    if (prismaError.code === 'P2002') {
      return res.status(400).json({
        status: 'error',
        message: 'A record with this value already exists',
        field: prismaError.meta?.target?.[0],
      });
    }

    // P2003: Foreign key constraint violation
    if (prismaError.code === 'P2003') {
      return res.status(400).json({
        status: 'error',
        message: 'Referenced record does not exist',
      });
    }

    // P2025: Record not found
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: 'Record not found',
      });
    }

    // Other Prisma errors
    logger.error('Unhandled Prisma error:', {
      code: prismaError.code,
      meta: prismaError.meta,
    });
  }

  // Operational errors (expected) - check for AppError from both locations
  if (err instanceof UtilsAppError || (err as any).isOperational) {
    const statusCode = (err as any).statusCode || 500;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Programming or unknown errors
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};
