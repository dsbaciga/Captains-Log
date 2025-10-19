import { Request, Response } from 'express';
import weatherService from '../services/weather.service';
import { refreshWeatherSchema } from '../types/weather.types';
import { AppError } from '../utils/errors';

/**
 * Get weather data for a trip's date range
 */
export const getWeatherForTrip = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const tripId = parseInt(req.params.tripId);

  if (isNaN(tripId)) {
    throw new AppError('Invalid trip ID', 400);
  }

  const weatherData = await weatherService.getWeatherForTrip(tripId, userId);

  res.json({
    status: 'success',
    data: weatherData,
  });
};

/**
 * Force refresh weather for a specific date
 */
export const refreshWeather = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const tripId = parseInt(req.params.tripId);

  if (isNaN(tripId)) {
    throw new AppError('Invalid trip ID', 400);
  }

  // Validate request body
  const validation = refreshWeatherSchema.safeParse(req.body);

  if (!validation.success) {
    throw new AppError('Invalid request data', 400);
  }

  const { date } = validation.data;

  const weatherData = await weatherService.refreshWeatherForDate(
    tripId,
    userId,
    date
  );

  res.json({
    status: 'success',
    data: weatherData,
  });
};
