import { Router } from 'express';
import { shareController } from '../controllers/share.controller';

/**
 * PUBLIC share routes — mounted at /api/public in index.ts.
 *
 * SECURITY: these routes intentionally have NO `authenticate` middleware.
 * Access control is the unguessable 64-hex-char share token itself: every
 * handler 404s unless a trip has that exact token AND shareEnabled=true.
 * A rate limiter is applied at the mount point in index.ts.
 */
const router = Router();

/**
 * @openapi
 * /api/public/trips/{token}:
 *   get:
 *     summary: Get a sanitized read-only view of a shared trip (no auth)
 *     tags: [Public Sharing]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: 64-character hex share token
 *     responses:
 *       200:
 *         description: Sanitized trip payload
 *       404:
 *         description: Token invalid or sharing disabled
 */
router.get('/trips/:token', shareController.getPublicTrip);

// Photo binaries for the shared trip. The /uploads static route requires
// authentication, so local photos are streamed through these token-scoped
// endpoints instead.
router.get('/trips/:token/photos/:photoId/file', shareController.getPublicPhotoFile);
router.get('/trips/:token/photos/:photoId/thumbnail', shareController.getPublicPhotoThumbnail);

export default router;
