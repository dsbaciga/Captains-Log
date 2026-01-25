import { Router } from 'express';
import { immichController } from '../controllers/immich.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All Immich routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/immich/test:
 *   post:
 *     summary: Test connection to Immich instance
 *     description: Verifies that the configured Immich API URL and key are valid
 *     tags: [Immich]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection successful
 *       401:
 *         description: Unauthorized
 *       503:
 *         description: Cannot connect to Immich
 */
router.post('/test', immichController.testConnection);

/**
 * @openapi
 * /api/immich/assets:
 *   get:
 *     summary: Get user's assets from Immich
 *     tags: [Immich]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Page size
 *     responses:
 *       200:
 *         description: List of Immich assets
 *       401:
 *         description: Unauthorized
 *       503:
 *         description: Immich service unavailable
 */
router.get('/assets', immichController.getAssets);

/**
 * @openapi
 * /api/immich/assets/date-range:
 *   get:
 *     summary: Get assets by date range
 *     description: Useful for getting photos matching trip dates
 *     tags: [Immich]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of assets within date range
 *       400:
 *         description: Invalid date format
 *       401:
 *         description: Unauthorized
 *       503:
 *         description: Immich service unavailable
 */
router.get('/assets/date-range', immichController.getAssetsByDateRange);

/**
 * @openapi
 * /api/immich/assets/{assetId}/thumbnail:
 *   get:
 *     summary: Get asset thumbnail (proxied)
 *     description: Proxies the thumbnail request to Immich server
 *     tags: [Immich]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Immich asset ID
 *     responses:
 *       200:
 *         description: Thumbnail image data
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Asset not found
 *       503:
 *         description: Immich service unavailable
 */
router.get('/assets/:assetId/thumbnail', immichController.getAssetThumbnail);

/**
 * @openapi
 * /api/immich/assets/{assetId}/original:
 *   get:
 *     summary: Get asset original file (proxied)
 *     description: Proxies the original file request to Immich server
 *     tags: [Immich]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Immich asset ID
 *     responses:
 *       200:
 *         description: Original file data
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Asset not found
 *       503:
 *         description: Immich service unavailable
 */
router.get('/assets/:assetId/original', immichController.getAssetOriginal);

/**
 * @openapi
 * /api/immich/assets/{assetId}:
 *   get:
 *     summary: Get a single asset by ID
 *     tags: [Immich]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Immich asset ID
 *     responses:
 *       200:
 *         description: Asset details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Asset not found
 *       503:
 *         description: Immich service unavailable
 */
router.get('/assets/:assetId', immichController.getAssetById);

/**
 * @openapi
 * /api/immich/assets/{assetId}/urls:
 *   get:
 *     summary: Get asset URLs (thumbnail and file)
 *     tags: [Immich]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Immich asset ID
 *     responses:
 *       200:
 *         description: Asset URLs
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Asset not found
 *       503:
 *         description: Immich service unavailable
 */
router.get('/assets/:assetId/urls', immichController.getAssetUrls);

/**
 * @openapi
 * /api/immich/search:
 *   post:
 *     summary: Search assets by metadata
 *     tags: [Immich]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query
 *               type:
 *                 type: string
 *                 enum: [IMAGE, VIDEO]
 *                 description: Filter by asset type
 *               city:
 *                 type: string
 *                 description: Filter by city
 *               country:
 *                 type: string
 *                 description: Filter by country
 *     responses:
 *       200:
 *         description: Search results
 *       401:
 *         description: Unauthorized
 *       503:
 *         description: Immich service unavailable
 */
router.post('/search', immichController.searchAssets);

/**
 * @openapi
 * /api/immich/albums:
 *   get:
 *     summary: Get user's albums from Immich
 *     tags: [Immich]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of Immich albums
 *       401:
 *         description: Unauthorized
 *       503:
 *         description: Immich service unavailable
 */
router.get('/albums', immichController.getAlbums);

/**
 * @openapi
 * /api/immich/albums/{albumId}:
 *   get:
 *     summary: Get album by ID with its assets
 *     tags: [Immich]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: albumId
 *         required: true
 *         schema:
 *           type: string
 *         description: Immich album ID
 *     responses:
 *       200:
 *         description: Album details with assets
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Album not found
 *       503:
 *         description: Immich service unavailable
 */
router.get('/albums/:albumId', immichController.getAlbumById);

export default router;
