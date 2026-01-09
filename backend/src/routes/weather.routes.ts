import express from 'express';
import { authenticate } from '../middleware/auth';
import * as weatherController from '../controllers/weather.controller';

const router = express.Router();

// GET /api/trips/:tripId/weather - Get all weather for trip date range
router.get(
  '/trips/:tripId/weather',
  authenticate,
  weatherController.getWeatherForTrip
);

// POST /api/trips/:tripId/weather/refresh - Force refresh weather for a specific date
router.post(
  '/trips/:tripId/weather/refresh',
  authenticate,
  weatherController.refreshWeather
);

// POST /api/trips/:tripId/weather/refresh-all - Force refresh all weather for trip
router.post(
  '/trips/:tripId/weather/refresh-all',
  authenticate,
  weatherController.refreshAllWeather
);

export default router;
