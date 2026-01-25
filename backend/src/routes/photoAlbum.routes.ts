import { Router } from 'express';
import { photoAlbumController } from '../controllers/photoAlbum.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/albums:
 *   get:
 *     summary: Get all albums across all trips
 *     tags: [Photo Albums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of albums to skip (for pagination)
 *       - in: query
 *         name: take
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of albums to return
 *     responses:
 *       200:
 *         description: List of all albums with pagination info
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Create a new photo album
 *     tags: [Photo Albums]
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
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               coverPhotoId:
 *                 type: integer
 *                 description: ID of the photo to use as album cover
 *     responses:
 *       201:
 *         description: Album created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/', photoAlbumController.getAllAlbums);
router.post('/', photoAlbumController.createAlbum);

/**
 * @openapi
 * /api/albums/trip/{tripId}:
 *   get:
 *     summary: Get all albums for a specific trip
 *     tags: [Photo Albums]
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
 *         description: List of albums for the trip
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.get('/trip/:tripId', photoAlbumController.getAlbumsByTrip);

/**
 * @openapi
 * /api/albums/{id}:
 *   get:
 *     summary: Get album by ID with paginated photos
 *     tags: [Photo Albums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The album ID
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of photos to skip (for pagination)
 *       - in: query
 *         name: take
 *         schema:
 *           type: integer
 *           default: 40
 *         description: Number of photos to return
 *     responses:
 *       200:
 *         description: Album details with paginated photos
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Album not found
 *   put:
 *     summary: Update an album
 *     tags: [Photo Albums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The album ID
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
 *               description:
 *                 type: string
 *               coverPhotoId:
 *                 type: integer
 *                 description: ID of the photo to use as album cover
 *     responses:
 *       200:
 *         description: Album updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Album not found
 *   delete:
 *     summary: Delete an album
 *     description: Removes the album but does not delete the photos
 *     tags: [Photo Albums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The album ID
 *     responses:
 *       200:
 *         description: Album deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Album not found
 */
router.get('/:id', photoAlbumController.getAlbumById);
router.put('/:id', photoAlbumController.updateAlbum);
router.delete('/:id', photoAlbumController.deleteAlbum);

/**
 * @openapi
 * /api/albums/{id}/photos:
 *   post:
 *     summary: Add photos to an album
 *     tags: [Photo Albums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The album ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [photoIds]
 *             properties:
 *               photoIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of photo IDs to add to the album
 *     responses:
 *       200:
 *         description: Photos added to album successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Album not found
 */
router.post('/:id/photos', photoAlbumController.addPhotosToAlbum);

/**
 * @openapi
 * /api/albums/{id}/photos/{photoId}:
 *   delete:
 *     summary: Remove a photo from an album
 *     description: Removes the photo from the album but does not delete the photo
 *     tags: [Photo Albums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The album ID
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The photo ID to remove
 *     responses:
 *       200:
 *         description: Photo removed from album successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Album or photo not found
 */
router.delete('/:id/photos/:photoId', photoAlbumController.removePhotoFromAlbum);

export default router;
