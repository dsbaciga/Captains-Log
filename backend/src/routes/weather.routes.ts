import express from 'express';
import { authenticate } from '../middleware/auth';
import { externalApiLimiter } from '../middleware/rateLimit';
import { weatherController } from '../controllers/weather.controller';

const router = express.Router();

/**
 * @openapi
 * /api/trips/{tripId}/weather:
 *   get:
 *     summary: Get weather data for a trip's date range
 *     description: Returns weather forecasts and historical data for each day of the trip
 *     tags: [Weather]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The trip ID
 *     responses:
 *       200:
 *         description: Weather data for the trip
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.get(
  '/trips/:tripId/weather',
  authenticate,
  weatherController.getWeatherForTrip
);

/**
 * @openapi
 * /api/trips/{tripId}/weather/refresh:
 *   post:
 *     summary: Force refresh weather for a specific date
 *     tags: [Weather]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The trip ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date to refresh weather for (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Weather refreshed for the specified date
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
// Forces an outbound OpenWeatherMap call — metered, so limit per user.
router.post(
  '/trips/:tripId/weather/refresh',
  authenticate,
  externalApiLimiter,
  weatherController.refreshWeather
);

/**
 * @openapi
 * /api/trips/{tripId}/weather/refresh-all:
 *   post:
 *     summary: Force refresh all weather data for a trip
 *     description: Refreshes weather data for all dates in the trip's date range
 *     tags: [Weather]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The trip ID
 *     responses:
 *       200:
 *         description: All weather data refreshed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
// Fans out to one OpenWeatherMap call per day of the trip — metered.
router.post(
  '/trips/:tripId/weather/refresh-all',
  authenticate,
  externalApiLimiter,
  weatherController.refreshAllWeather
);

export default router;
