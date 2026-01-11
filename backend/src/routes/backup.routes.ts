import express from 'express';
import backupController from '../controllers/backup.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All backup routes require authentication
router.use(authenticate);

// Create and download backup
router.post('/create', backupController.createBackup);

// Restore from backup
router.post('/restore', backupController.restoreFromBackup);

// Get backup info
router.get('/info', backupController.getBackupInfo);

export default router;
