import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { companionController } from '../controllers/companion.controller';

const router = Router();

// Multer configuration for avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max for avatars
  },
  fileFilter: (_req, file, cb) => {
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
 * /api/companions:
 *   post:
 *     summary: Create a new travel companion
 *     tags: [Companions]
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
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Companion created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: Get all companions for the current user
 *     tags: [Companions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's companions
 *       401:
 *         description: Unauthorized
 */
router.post('/', companionController.createCompanion);
router.get('/', companionController.getCompanionsByUser);

/**
 * @openapi
 * /api/companions/{id}:
 *   get:
 *     summary: Get a companion by ID
 *     tags: [Companions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The companion ID
 *     responses:
 *       200:
 *         description: Companion details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Companion not found
 *   put:
 *     summary: Update a companion
 *     tags: [Companions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The companion ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Companion updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Companion not found
 *   delete:
 *     summary: Delete a companion
 *     tags: [Companions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The companion ID
 *     responses:
 *       200:
 *         description: Companion deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Companion not found
 */
router.get('/:id', companionController.getCompanionById);
router.put('/:id', companionController.updateCompanion);
router.delete('/:id', companionController.deleteCompanion);

/**
 * @openapi
 * /api/companions/{id}/avatar:
 *   post:
 *     summary: Upload an avatar for a companion
 *     tags: [Companions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The companion ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Image file (max 5MB)
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *       400:
 *         description: Invalid file type or file too large
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Companion not found
 *   delete:
 *     summary: Delete a companion's avatar
 *     tags: [Companions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The companion ID
 *     responses:
 *       200:
 *         description: Avatar deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Companion not found
 */
router.post('/:id/avatar', upload.single('avatar'), companionController.uploadAvatar);
router.delete('/:id/avatar', companionController.deleteAvatar);

/**
 * @openapi
 * /api/companions/{id}/avatar/immich:
 *   post:
 *     summary: Set a companion's avatar from Immich
 *     tags: [Companions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The companion ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assetId]
 *             properties:
 *               assetId:
 *                 type: string
 *                 description: Immich asset ID
 *     responses:
 *       200:
 *         description: Avatar set from Immich successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Companion or Immich asset not found
 */
router.post('/:id/avatar/immich', companionController.setImmichAvatar);

/**
 * @openapi
 * /api/companions/link:
 *   post:
 *     summary: Link a companion to a trip
 *     tags: [Companions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tripId, companionId]
 *             properties:
 *               tripId:
 *                 type: integer
 *               companionId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Companion linked to trip successfully
 *       400:
 *         description: Validation error or companion already linked
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip or companion not found
 */
router.post('/link', companionController.linkCompanionToTrip);

/**
 * @openapi
 * /api/companions/trips/{tripId}/companions/{companionId}:
 *   delete:
 *     summary: Unlink a companion from a trip
 *     tags: [Companions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The trip ID
 *       - in: path
 *         name: companionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The companion ID
 *     responses:
 *       200:
 *         description: Companion unlinked from trip successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip-companion link not found
 */
router.delete('/trips/:tripId/companions/:companionId', companionController.unlinkCompanionFromTrip);

/**
 * @openapi
 * /api/companions/trips/{tripId}:
 *   get:
 *     summary: Get all companions for a specific trip
 *     tags: [Companions]
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
 *         description: List of companions for the trip
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.get('/trips/:tripId', companionController.getCompanionsByTrip);

export default router;
