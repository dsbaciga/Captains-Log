import { Response } from 'express';

/**
 * Response Helper Utilities
 *
 * Standardizes API response format across all controllers.
 * All responses follow the format: { status: 'success' | 'error', data?: T, message?: string }
 */

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200): void => {
  res.status(statusCode).json({ status: 'success', data });
};

export const sendCreated = <T>(res: Response, data: T): void => {
  sendSuccess(res, data, 201);
};

export const sendNoContent = (res: Response): void => {
  res.status(204).send();
};

export const sendMessage = (res: Response, message: string, statusCode = 200): void => {
  res.status(statusCode).json({ status: 'success', message });
};
