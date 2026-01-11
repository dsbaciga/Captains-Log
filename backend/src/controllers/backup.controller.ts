import { Request, Response } from 'express';
import backupService from '../services/backup.service';
import restoreService from '../services/restore.service';
import { BackupDataSchema, RestoreOptionsSchema } from '../types/backup.types';
import { AppError } from '../utils/errors';

/**
 * Create and download a backup of all user data
 */
export async function createBackup(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    // Create backup
    const backupData = await backupService.createBackup(userId);

    // Set headers for file download
    const filename = `travel-life-backup-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send backup data as downloadable JSON file
    res.json(backupData);
  } catch (error) {
    console.error('Backup creation error:', error);
    throw error;
  }
}

/**
 * Restore user data from a backup file
 */
export async function restoreFromBackup(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    // Parse and validate backup data
    const backupData = BackupDataSchema.parse(req.body.backupData);

    // Parse options
    const options = RestoreOptionsSchema.parse(req.body.options || {});

    // Restore data
    const result = await restoreService.restoreFromBackup(userId, backupData, options);

    res.json({
      status: 'success',
      message: result.message,
      data: {
        stats: result.stats,
      },
    });
  } catch (error) {
    console.error('Restore error:', error);
    if (error instanceof Error) {
      throw new AppError(error.message, 400);
    }
    throw error;
  }
}

/**
 * Get backup information/metadata
 */
export async function getBackupInfo(req: Request, res: Response) {
  try {
    // For now, just return basic info
    // In the future, we could store backup metadata in the database
    res.json({
      status: 'success',
      data: {
        version: '1.0.0',
        supportedFormats: ['json'],
      },
    });
  } catch (error) {
    console.error('Get backup info error:', error);
    throw error;
  }
}

export default {
  createBackup,
  restoreFromBackup,
  getBackupInfo,
};
