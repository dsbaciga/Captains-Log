import { Router } from 'express';
import { memoriesController } from '../controllers/memories.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/memories/on-this-day:
 *   get:
 *     summary: Get memories (trips, photos, journal entries) from this month/day in prior years
 *     tags: [Memories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Month override (defaults to the server's current month)
 *       - in: query
 *         name: day
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 31
 *         description: Day override (defaults to the server's current day)
 *     responses:
 *       200:
 *         description: Memories grouped by year, newest first
 */
router.get('/on-this-day', memoriesController.getOnThisDay);

/**
 * @openapi
 * /api/memories/year-in-review/{year}:
 *   get:
 *     summary: Get aggregated travel statistics and highlights for a calendar year
 *     tags: [Memories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Year in review aggregates (empty aggregates for years with no data)
 */
router.get('/year-in-review/:year', memoriesController.getYearInReview);

export default router;
