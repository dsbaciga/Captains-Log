import { Request, Response } from 'express';
import weatherService from '../services/weather.service';
import { refreshWeatherSchema } from '../types/weather.types';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { requireUserId } from '../utils/controllerHelpers';

export const weatherController = {
  /**
   * Get weather data for a trip's date range
   */
  getWeatherForTrip: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const weatherData = await weatherService.getWeatherForTrip(tripId, userId);
    res.json({
      status: 'success',
      data: weatherData,
    });
  }),

  /**
   * Force refresh weather for a specific date
   */
  refreshWeather: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const { date } = refreshWeatherSchema.parse(req.body);
    const weatherData = await weatherService.refreshWeatherForDate(
      tripId,
      userId,
      date
    );
    res.json({
      status: 'success',
      data: weatherData,
    });
  }),

  /**
   * Force refresh all weather for a trip
   */
  refreshAllWeather: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const weatherData = await weatherService.refreshAllWeatherForTrip(
      tripId,
      userId
    );
    res.json({
      status: 'success',
      data: weatherData,
    });
  }),
};
