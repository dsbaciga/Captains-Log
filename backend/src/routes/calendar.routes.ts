import { Router } from 'express';
import { calendarFeedController } from '../controllers/calendarFeed.controller';

const router = Router();

/**
 * @openapi
 * /api/calendar/{token}.ics:
 *   get:
 *     summary: iCal subscription feed (unauthenticated)
 *     description: |
 *       Read-only iCalendar feed of the token owner's trips, transportation,
 *       and lodging. The secret token in the URL is the only credential —
 *       anyone with the URL can read the feed. Returns text/calendar.
 *       The `.ics` suffix is optional.
 *     tags: [Calendar]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Per-user secret calendar token (64 hex characters)
 *     responses:
 *       200:
 *         description: iCalendar document
 *         content:
 *           text/calendar:
 *             schema:
 *               type: string
 *       404:
 *         description: Unknown or revoked token
 */
router.get('/:token', calendarFeedController.getFeed);

export default router;
