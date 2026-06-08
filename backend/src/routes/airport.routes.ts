import express from 'express';
import { airportController } from '../controllers/airport.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/airports:
 *   get:
 *     summary: Search airports by IATA/ICAO code or name
 *     description: >
 *       Returns airports (those with a 3-letter IATA code and scheduled
 *       passenger service) matching the query. Powers the airport picker that
 *       lets users add airports to the airports checklist by typing a code.
 *     tags: [Airports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: A 3-letter IATA code, ICAO code, or part of an airport/city name
 *     responses:
 *       200:
 *         description: List of matching airports
 *       401:
 *         description: Unauthorized
 */
router.get('/', airportController.searchAirports);

export default router;
