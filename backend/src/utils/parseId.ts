import { AppError } from './errors';

/**
 * Safely parses a string to an integer, throwing an AppError if invalid.
 * Use this instead of raw parseInt() for request parameters to ensure
 * proper validation and consistent error responses.
 *
 * @param value - The string value to parse
 * @param paramName - The parameter name for error messages (default: 'id')
 * @returns The parsed integer
 * @throws AppError with 400 status if the value is not a valid integer
 *
 * @example
 * const tripId = parseId(req.params.tripId, 'tripId');
 * const id = parseId(req.params.id);
 */
export function parseId(value: string, paramName: string = 'id'): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new AppError(`Invalid ${paramName}: must be a number`, 400);
  }
  return parsed;
}
