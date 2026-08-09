import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { customItemController } from '../controllers/customItem.controller';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/custom-items/types:
 *   get:
 *     summary: List the current user's custom item types
 *     description: >
 *       Returns the user's type registry. On the first call for a user with no
 *       types, the starter set (Reservation, Contact, Reminder, Misc) is seeded
 *       and returned. A user who has deleted every type is not re-seeded.
 *     tags: [Custom Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of custom item types
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Create a custom item type
 *     tags: [Custom Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               icon:
 *                 type: string
 *                 maxLength: 100
 *               color:
 *                 type: string
 *                 description: Hex colour, e.g. "#4F46E5"
 *     responses:
 *       201:
 *         description: Type created successfully
 *       409:
 *         description: A type with that name already exists
 */
router.get('/types', customItemController.getTypes);
router.post('/types', customItemController.createType);

/**
 * @openapi
 * /api/custom-items/types/{id}:
 *   put:
 *     summary: Update a custom item type
 *     description: >
 *       Seeded starter types are editable — `isDefault` records provenance only
 *       and never gates editing.
 *     tags: [Custom Items]
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
 *         description: Type updated successfully
 *       404:
 *         description: Type not found
 *       409:
 *         description: A type with that name already exists
 *   delete:
 *     summary: Delete a custom item type
 *     description: >
 *       Items using the type are kept and become untyped, so no trip content is
 *       lost.
 *     tags: [Custom Items]
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
 *         description: Type deleted successfully
 *       404:
 *         description: Type not found
 */
router.put('/types/:id', customItemController.updateType);
router.delete('/types/:id', customItemController.deleteType);

/**
 * @openapi
 * /api/custom-items:
 *   post:
 *     summary: Create a custom item
 *     tags: [Custom Items]
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
 *               typeId:
 *                 type: integer
 *                 description: A custom item type belonging to the current user
 *               name:
 *                 type: string
 *                 maxLength: 500
 *               notes:
 *                 type: string
 *                 description: Rich text
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
 *               locationId:
 *                 type: integer
 *                 description: A location on the same trip; drives the map marker
 *               cost:
 *                 type: number
 *               currency:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 3
 *               url:
 *                 type: string
 *                 format: uri
 *               confirmationNumber:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       201:
 *         description: Custom item created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No edit permission on the trip
 */
router.post('/', customItemController.createCustomItem);

/**
 * @openapi
 * /api/custom-items/trip/{tripId}:
 *   get:
 *     summary: List a trip's custom items
 *     description: Ordered by start time (undated last), then name.
 *     tags: [Custom Items]
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
 *         description: List of custom items
 *       403:
 *         description: No view permission on the trip
 */
router.get('/trip/:tripId', customItemController.getCustomItemsByTrip);

/**
 * @openapi
 * /api/custom-items/trip/{tripId}/bulk:
 *   delete:
 *     summary: Bulk delete custom items
 *     tags: [Custom Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Items deleted successfully
 *   patch:
 *     summary: Bulk update custom items
 *     description: Only typeId, notes and timezone may be set in bulk.
 *     tags: [Custom Items]
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
 *         description: Items updated successfully
 */
router.delete('/trip/:tripId/bulk', customItemController.bulkDeleteCustomItems);
router.patch('/trip/:tripId/bulk', customItemController.bulkUpdateCustomItems);

/**
 * @openapi
 * /api/custom-items/{id}:
 *   get:
 *     summary: Get a custom item by ID
 *     tags: [Custom Items]
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
 *         description: The custom item
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update a custom item
 *     description: >
 *       Changing cost or currency clears the frozen FX snapshot so the budget
 *       summary recomputes it.
 *     tags: [Custom Items]
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
 *         description: Updated successfully
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete a custom item
 *     tags: [Custom Items]
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
 *         description: Deleted successfully
 *       404:
 *         description: Not found
 */
router.get('/:id', customItemController.getCustomItemById);
router.put('/:id', customItemController.updateCustomItem);
router.delete('/:id', customItemController.deleteCustomItem);

export default router;
