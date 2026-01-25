import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { activityController } from '../controllers/activity.controller';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/activities:
 *   post:
 *     summary: Create a new activity
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tripId, name]
 *             properties:
 *               tripId:
 *                 type: integer
 *               parentId:
 *                 type: integer
 *                 description: Parent activity ID for nested activities
 *               name:
 *                 type: string
 *                 maxLength: 500
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 maxLength: 100
 *               allDay:
 *                 type: boolean
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               timezone:
 *                 type: string
 *                 maxLength: 100
 *               cost:
 *                 type: number
 *               currency:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 3
 *               bookingUrl:
 *                 type: string
 *                 format: uri
 *                 maxLength: 500
 *               bookingReference:
 *                 type: string
 *                 maxLength: 255
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Activity created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', activityController.createActivity);

/**
 * @openapi
 * /api/activities/trip/{tripId}:
 *   get:
 *     summary: Get all activities for a trip
 *     tags: [Activities]
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
 *         description: List of activities for the trip
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.get('/trip/:tripId', activityController.getActivitiesByTrip);

/**
 * @openapi
 * /api/activities/{id}:
 *   get:
 *     summary: Get an activity by ID
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The activity ID
 *     responses:
 *       200:
 *         description: Activity details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Activity not found
 *   put:
 *     summary: Update an activity
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The activity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               parentId:
 *                 type: integer
 *               name:
 *                 type: string
 *                 maxLength: 500
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 maxLength: 100
 *               allDay:
 *                 type: boolean
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               timezone:
 *                 type: string
 *                 maxLength: 100
 *               cost:
 *                 type: number
 *               currency:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 3
 *               bookingUrl:
 *                 type: string
 *                 format: uri
 *                 maxLength: 500
 *               bookingReference:
 *                 type: string
 *                 maxLength: 255
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Activity updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Activity not found
 *   delete:
 *     summary: Delete an activity
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The activity ID
 *     responses:
 *       200:
 *         description: Activity deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Activity not found
 */
router.get('/:id', activityController.getActivityById);
router.put('/:id', activityController.updateActivity);
router.delete('/:id', activityController.deleteActivity);

export default router;
