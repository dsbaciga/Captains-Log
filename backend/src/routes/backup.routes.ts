import express from 'express';
import backupController from '../controllers/backup.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All backup routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/backup/create:
 *   post:
 *     summary: Create and download a backup
 *     description: Creates a ZIP archive containing all user data (trips, photos metadata, settings, etc.)
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup file
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Backup creation failed
 */
router.post('/create', backupController.createBackup);

/**
 * @openapi
 * /api/backup/restore:
 *   post:
 *     summary: Restore from backup
 *     description: Restores user data from a previously created backup file. This will overwrite existing data.
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               backup:
 *                 type: string
 *                 format: binary
 *                 description: Backup ZIP file
 *     responses:
 *       200:
 *         description: Backup restored successfully
 *       400:
 *         description: Invalid backup file
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Restore failed
 */
router.post('/restore', backupController.restoreFromBackup);

/**
 * @openapi
 * /api/backup/info:
 *   get:
 *     summary: Get backup information
 *     description: Returns information about what would be included in a backup
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup info including counts of entities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tripCount:
 *                   type: integer
 *                 photoCount:
 *                   type: integer
 *                 locationCount:
 *                   type: integer
 *                 activityCount:
 *                   type: integer
 *                 albumCount:
 *                   type: integer
 *                 estimatedSize:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/info', backupController.getBackupInfo);

export default router;
