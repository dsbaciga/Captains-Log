import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { savedLinkController } from '../controllers/savedLink.controller';

/**
 * Saved link routes.
 *
 * These are USER-scoped at the root (like /api/pdf-imports) rather than nested
 * under a trip, because a link exists in the inbox before it is assigned to a
 * trip. A trip-scoped read router is exported separately below.
 */
const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/saved-links:
 *   post:
 *     summary: Save a link, optionally assigning it to a trip
 *     tags: [Saved Links]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 maxLength: 2048
 *               tripId:
 *                 type: integer
 *                 nullable: true
 *                 description: Omit or null to leave the link in the inbox
 *               title:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Overrides the scraped Open Graph title
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Link saved; metadata is fetched in the background
 *       400:
 *         description: Validation error, or URL rejected as internal/private
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: List saved links
 *     tags: [Saved Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tripId
 *         required: false
 *         schema:
 *           oneOf:
 *             - type: integer
 *             - type: string
 *               enum: [none]
 *         description: Numeric trip ID, or "none" for the unassigned inbox. Omit for all.
 *     responses:
 *       200:
 *         description: List of saved links
 *       401:
 *         description: Unauthorized
 */
router.post('/', savedLinkController.createSavedLink);
router.get('/', savedLinkController.getSavedLinks);

/**
 * @openapi
 * /api/saved-links/inbox-count:
 *   get:
 *     summary: Count of links not yet assigned to a trip
 *     tags: [Saved Links]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inbox count
 *       401:
 *         description: Unauthorized
 */
// Static sub-paths must be registered before /:id so they aren't swallowed by it.
router.get('/inbox-count', savedLinkController.getInboxCount);

/**
 * @openapi
 * /api/saved-links/{id}:
 *   get:
 *     summary: Get a single saved link
 *     tags: [Saved Links]
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
 *         description: The saved link
 *       404:
 *         description: Not found
 *   patch:
 *     summary: Update a saved link, including assigning it to a trip
 *     tags: [Saved Links]
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
 *               url:
 *                 type: string
 *                 format: uri
 *               tripId:
 *                 type: integer
 *                 nullable: true
 *                 description: Null returns the link to the inbox and drops its entity links
 *               title:
 *                 type: string
 *                 nullable: true
 *               notes:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Updated link
 *       400:
 *         description: Validation error, or URL rejected as internal/private
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete a saved link and any entity links pointing at it
 *     tags: [Saved Links]
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
 *         description: Deleted
 *       404:
 *         description: Not found
 */
router.get('/:id', savedLinkController.getSavedLinkById);
router.patch('/:id', savedLinkController.updateSavedLink);
router.delete('/:id', savedLinkController.deleteSavedLink);

/**
 * @openapi
 * /api/saved-links/{id}/refresh-metadata:
 *   post:
 *     summary: Re-scrape Open Graph metadata for a saved link
 *     tags: [Saved Links]
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
 *         description: Link with refreshed metadata
 *       404:
 *         description: Not found
 */
router.post('/:id/refresh-metadata', savedLinkController.refreshMetadata);

/**
 * Trip-scoped read router, mounted at /api/trips/:tripId/saved-links.
 * Permission-scoped to the trip so collaborators see its links too.
 */
export const tripSavedLinksRouter = Router({ mergeParams: true });

tripSavedLinksRouter.use(authenticate);

/**
 * @openapi
 * /api/trips/{tripId}/saved-links:
 *   get:
 *     summary: List saved links attached to a trip
 *     tags: [Saved Links]
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
 *         description: List of saved links for the trip
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
tripSavedLinksRouter.get('/', savedLinkController.getSavedLinksByTrip);

export default router;
