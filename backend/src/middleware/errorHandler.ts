import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../config/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Enhanced logging with full error details
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
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

  // Operational errors (expected)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
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
