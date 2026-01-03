import { Router } from 'express';
import journalEntryController from '../controllers/journalEntry.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/journal:
 *   post:
 *     summary: Create a new journal entry
 *     tags: [Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tripId, content, entryType]
 *             properties:
 *               tripId:
 *                 type: integer
 *               date:
 *                 type: string
 *                 format: date
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               entryType:
 *                 type: string
 *                 enum: [trip, daily]
 *               mood:
 *                 type: string
 *               weatherNotes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Journal entry created
 */
router.post('/', journalEntryController.createJournalEntry);

/**
 * @openapi
 * /api/journal/trip/{tripId}:
 *   get:
 *     summary: Get all journal entries for a trip
 *     tags: [Journal Entries]
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
 *         description: List of journal entries
 */
router.get('/trip/:tripId', journalEntryController.getJournalEntriesByTrip);

/**
 * @openapi
 * /api/journal/{id}:
 *   get:
 *     summary: Get a journal entry by ID
 *     tags: [Journal Entries]
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
 *         description: Journal entry details
 *   put:
 *     summary: Update a journal entry
 *     tags: [Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               mood:
 *                 type: string
 *               weatherNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Journal entry updated
 *   delete:
 *     summary: Delete a journal entry
 *     tags: [Journal Entries]
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
 *         description: Journal entry deleted
 */
router.get('/:id', journalEntryController.getJournalEntryById);
router.put('/:id', journalEntryController.updateJournalEntry);
router.delete('/:id', journalEntryController.deleteJournalEntry);

export default router;
