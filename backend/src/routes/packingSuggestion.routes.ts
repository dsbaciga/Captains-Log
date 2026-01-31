import express from 'express';
import { authenticate } from '../middleware/auth';
import { packingSuggestionController } from '../controllers/packingSuggestion.controller';

const router = express.Router();

/**
 * @openapi
 * /api/trips/{tripId}/packing-suggestions:
 *   get:
 *     summary: Get packing suggestions for a trip based on weather data
 *     description: Analyzes weather data for the trip's date range and returns packing recommendations
 *     tags: [Packing Suggestions]
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
 *         description: Packing suggestions based on weather analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           category:
 *                             type: string
 *                             enum: [clothing, accessories, gear, health]
 *                           item:
 *                             type: string
 *                           reason:
 *                             type: string
 *                           priority:
 *                             type: string
 *                             enum: [essential, recommended, optional]
 *                     weatherSummary:
 *                       type: object
 *                       properties:
 *                         minTemp:
 *                           type: number
 *                           nullable: true
 *                         maxTemp:
 *                           type: number
 *                           nullable: true
 *                         avgTemp:
 *                           type: number
 *                           nullable: true
 *                         hasRain:
 *                           type: boolean
 *                         hasSnow:
 *                           type: boolean
 *                         maxPrecipitation:
 *                           type: number
 *                         avgHumidity:
 *                           type: number
 *                           nullable: true
 *                         maxWindSpeed:
 *                           type: number
 *                           nullable: true
 *                         tempRange:
 *                           type: number
 *                           nullable: true
 *                         conditions:
 *                           type: array
 *                           items:
 *                             type: string
 *                     tripDays:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.get(
  '/trips/:tripId/packing-suggestions',
  authenticate,
  packingSuggestionController.getSuggestions
);

export default router;
