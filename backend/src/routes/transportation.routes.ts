import { Router } from 'express';
import transportationController from '../controllers/transportation.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/transportation:
 *   post:
 *     summary: Create a new transportation record
 *     tags: [Transportation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tripId, type]
 *             properties:
 *               tripId:
 *                 type: integer
 *               type:
 *                 type: string
 *               fromLocationId:
 *                 type: integer
 *               toLocationId:
 *                 type: integer
 *               fromLocationName:
 *                 type: string
 *               toLocationName:
 *                 type: string
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *               arrivalTime:
 *                 type: string
 *                 format: date-time
 *               startTimezone:
 *                 type: string
 *               endTimezone:
 *                 type: string
 *               carrier:
 *                 type: string
 *               vehicleNumber:
 *                 type: string
 *               confirmationNumber:
 *                 type: string
 *               cost:
 *                 type: number
 *               currency:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transportation created
 */
router.post('/', transportationController.createTransportation);

/**
 * @openapi
 * /api/transportation/trip/{tripId}:
 *   get:
 *     summary: Get all transportation for a trip
 *     tags: [Transportation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of transportation
 */
router.get('/trip/:tripId', transportationController.getTransportationByTrip);

/**
 * @openapi
 * /api/transportation/trip/{tripId}/recalculate-distances:
 *   post:
 *     summary: Recalculate route distances for all transportation in a trip
 *     tags: [Transportation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Recalculation triggered
 */
router.post('/trip/:tripId/recalculate-distances', transportationController.recalculateDistances);

/**
 * @openapi
 * /api/transportation/{id}:
 *   get:
 *     summary: Get a transportation record by ID
 *     tags: [Transportation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transportation details
 *   put:
 *     summary: Update a transportation record
 *     tags: [Transportation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transportation updated
 *   delete:
 *     summary: Delete a transportation record
 *     tags: [Transportation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transportation deleted
 */
router.get('/:id', transportationController.getTransportationById);
router.put('/:id', transportationController.updateTransportation);
router.delete('/:id', transportationController.deleteTransportation);

export default router;
