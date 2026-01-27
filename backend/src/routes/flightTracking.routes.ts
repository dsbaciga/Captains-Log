import express from 'express';
import { authenticate } from '../middleware/auth';
import { flightTrackingController } from '../controllers/flightTracking.controller';

const router = express.Router();

/**
 * @openapi
 * /api/transportation/{transportationId}/flight-status:
 *   get:
 *     summary: Get flight status for a transportation record
 *     description: Returns real-time flight tracking data from AviationStack API
 *     tags: [Flight Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transportationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The transportation ID
 *     responses:
 *       200:
 *         description: Flight status data
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
 *                     id:
 *                       type: integer
 *                     transportationId:
 *                       type: integer
 *                     flightNumber:
 *                       type: string
 *                     airlineCode:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [scheduled, active, landed, cancelled, diverted]
 *                     gate:
 *                       type: string
 *                     terminal:
 *                       type: string
 *                     baggageClaim:
 *                       type: string
 *                     departureDelay:
 *                       type: integer
 *                       description: Delay in minutes
 *                     arrivalDelay:
 *                       type: integer
 *                       description: Delay in minutes
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transportation not found
 */
router.get(
  '/transportation/:transportationId/flight-status',
  authenticate,
  flightTrackingController.getFlightStatus
);

/**
 * @openapi
 * /api/transportation/{transportationId}/flight-status:
 *   put:
 *     summary: Manually update flight tracking info
 *     description: Update gate, terminal, or other flight info when user knows current status
 *     tags: [Flight Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transportationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The transportation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               flightNumber:
 *                 type: string
 *               airlineCode:
 *                 type: string
 *               gate:
 *                 type: string
 *               terminal:
 *                 type: string
 *               baggageClaim:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [scheduled, active, landed, cancelled, diverted]
 *     responses:
 *       200:
 *         description: Flight tracking info updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transportation not found
 */
router.put(
  '/transportation/:transportationId/flight-status',
  authenticate,
  flightTrackingController.updateFlightTracking
);

/**
 * @openapi
 * /api/trips/{tripId}/flights/refresh:
 *   post:
 *     summary: Refresh flight status for all flights in a trip
 *     description: Fetches latest flight data from AviationStack for all flight transportations
 *     tags: [Flight Tracking]
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
 *         description: Flight statuses refreshed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 message:
 *                   type: string
 *                   example: Refreshed 3 flight(s)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.post(
  '/trips/:tripId/flights/refresh',
  authenticate,
  flightTrackingController.refreshFlightsForTrip
);

export default router;
