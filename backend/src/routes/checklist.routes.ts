import express from 'express';
import { checklistController } from '../controllers/checklist.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// IMPORTANT: Specific routes MUST come before wildcard /:id routes
// Otherwise Express will match /:id first and "defaults" becomes the id

/**
 * @openapi
 * /api/checklists/initialize:
 *   post:
 *     summary: Initialize default checklists for the user
 *     description: Creates default travel checklists if they don't exist
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default checklists initialized
 *       401:
 *         description: Unauthorized
 */
router.post('/initialize', checklistController.initializeDefaults);

/**
 * @openapi
 * /api/checklists/auto-check:
 *   post:
 *     summary: Auto-check items based on trip data
 *     description: Automatically checks off checklist items based on existing trip data (e.g., if hotel is booked)
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tripId]
 *             properties:
 *               tripId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Items auto-checked based on trip data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.post('/auto-check', checklistController.autoCheckFromTrips);

/**
 * @openapi
 * /api/checklists/defaults:
 *   delete:
 *     summary: Remove all default checklists
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default checklists removed
 *       401:
 *         description: Unauthorized
 */
router.delete('/defaults', checklistController.removeDefaults);

/**
 * @openapi
 * /api/checklists/defaults/restore:
 *   post:
 *     summary: Restore default checklists
 *     description: Re-creates default checklists if they were removed
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default checklists restored
 *       401:
 *         description: Unauthorized
 */
router.post('/defaults/restore', checklistController.restoreDefaults);

/**
 * @openapi
 * /api/checklists/defaults/status:
 *   get:
 *     summary: Get status of default checklists
 *     description: Returns which default checklists are currently active
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default checklists status
 *       401:
 *         description: Unauthorized
 */
router.get('/defaults/status', checklistController.getDefaultsStatus);

/**
 * @openapi
 * /api/checklists/defaults/add:
 *   post:
 *     summary: Add specific default checklists
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [types]
 *             properties:
 *               types:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of default checklist types to add
 *     responses:
 *       200:
 *         description: Default checklists added
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/defaults/add', checklistController.addDefaults);

/**
 * @openapi
 * /api/checklists/defaults/remove:
 *   post:
 *     summary: Remove specific default checklists by type
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [types]
 *             properties:
 *               types:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of default checklist types to remove
 *     responses:
 *       200:
 *         description: Default checklists removed
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/defaults/remove', checklistController.removeDefaultsByType);

/**
 * @openapi
 * /api/checklists/items/{itemId}:
 *   put:
 *     summary: Update a checklist item
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The checklist item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               checked:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Checklist item updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 *   delete:
 *     summary: Delete a checklist item
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The checklist item ID
 *     responses:
 *       200:
 *         description: Checklist item deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 */
router.put('/items/:itemId', checklistController.updateChecklistItem);
router.delete('/items/:itemId', checklistController.deleteChecklistItem);

/**
 * @openapi
 * /api/checklists:
 *   get:
 *     summary: Get all checklists for the current user
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tripId
 *         schema:
 *           type: integer
 *         description: Filter by trip ID (optional)
 *     responses:
 *       200:
 *         description: List of checklists
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Create a new checklist
 *     tags: [Checklists]
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
 *               tripId:
 *                 type: integer
 *                 description: Optional trip association
 *               isDefault:
 *                 type: boolean
 *                 default: false
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     checked:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: Checklist created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/', checklistController.getChecklists);
router.post('/', checklistController.createChecklist);

/**
 * @openapi
 * /api/checklists/{id}:
 *   get:
 *     summary: Get a checklist by ID
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The checklist ID
 *     responses:
 *       200:
 *         description: Checklist details with items
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Checklist not found
 *   put:
 *     summary: Update a checklist
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The checklist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               tripId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Checklist updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Checklist not found
 *   delete:
 *     summary: Delete a checklist
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The checklist ID
 *     responses:
 *       200:
 *         description: Checklist deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Checklist not found
 */
router.get('/:id', checklistController.getChecklistById);
router.put('/:id', checklistController.updateChecklist);
router.delete('/:id', checklistController.deleteChecklist);

/**
 * @openapi
 * /api/checklists/{id}/items:
 *   post:
 *     summary: Add an item to a checklist
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The checklist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *               checked:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Item added to checklist
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Checklist not found
 */
router.post('/:id/items', checklistController.addChecklistItem);

export default router;
