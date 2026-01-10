import { Router } from 'express';
import multer from 'multer';
import photoController from '../controllers/photo.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Configure multer for memory storage (files will be processed before saving)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// All routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/photos/upload:
 *   post:
 *     summary: Upload a new photo
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *               tripId:
 *                 type: integer
 *               caption:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               takenAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Photo uploaded
 */
router.post('/upload', upload.single('photo'), photoController.uploadPhoto);

/**
 * @openapi
 * /api/photos/immich:
 *   post:
 *     summary: Link a photo from Immich
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tripId, immichAssetId]
 *             properties:
 *               tripId:
 *                 type: integer
 *               immichAssetId:
 *                 type: string
 *               caption:
 *                 type: string
 *     responses:
 *       201:
 *         description: Photo linked
 */
router.post('/immich', photoController.linkImmichPhoto);

/**
 * @openapi
 * /api/photos/immich/batch:
 *   post:
 *     summary: Link multiple photos from Immich in a batch
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tripId, assets]
 *             properties:
 *               tripId:
 *                 type: integer
 *               assets:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [immichAssetId]
 *                   properties:
 *                     immichAssetId:
 *                       type: string
 *                     caption:
 *                       type: string
 *                     takenAt:
 *                       type: string
 *                       format: date-time
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *     responses:
 *       201:
 *         description: Batch linking results
 */
router.post('/immich/batch', photoController.linkImmichPhotosBatch);

/**
 * @openapi
 * /api/photos/trip/{tripId}:
 *   get:
 *     summary: Get all photos for a specific trip
 *     tags: [Photos]
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
 *         description: List of photos
 */
router.get('/trip/:tripId', photoController.getPhotosByTrip);

/**
 * @openapi
 * /api/photos/trip/{tripId}/immich-asset-ids:
 *   get:
 *     summary: Get all Immich asset IDs for a specific trip
 *     tags: [Photos]
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
 *         description: List of Immich asset IDs
 */
router.get('/trip/:tripId/immich-asset-ids', photoController.getImmichAssetIdsByTrip);

/**
 * @openapi
 * /api/photos/trip/{tripId}/unsorted:
 *   get:
 *     summary: Get photos not assigned to any album in a trip
 *     tags: [Photos]
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
 *         description: List of unsorted photos
 */
router.get('/trip/:tripId/unsorted', photoController.getUnsortedPhotosByTrip);

/**
 * @openapi
 * /api/photos/{id}:
 *   get:
 *     summary: Get a photo by ID
 *     tags: [Photos]
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
 *         description: Photo details
 *   put:
 *     summary: Update photo metadata
 *     tags: [Photos]
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
 *               caption:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               takenAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Photo updated
 *   delete:
 *     summary: Delete a photo
 *     tags: [Photos]
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
 *         description: Photo deleted
 */
router.get('/:id', photoController.getPhotoById);
router.put('/:id', photoController.updatePhoto);
router.delete('/:id', photoController.deletePhoto);

export default router;
