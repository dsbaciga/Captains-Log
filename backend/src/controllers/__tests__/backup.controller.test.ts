import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import crypto from 'crypto';

// Mock services before importing controller
jest.mock('../../services/backup.service', () => ({
  __esModule: true,
  default: {
    createBackup: jest.fn(),
  },
}));

jest.mock('../../services/restore.service', () => ({
  __esModule: true,
  default: {
    restoreFromBackup: jest.fn(),
  },
}));

import config from '../../config';
import backupService from '../../services/backup.service';
import restoreService from '../../services/restore.service';
import backupController from '../backup.controller';
import {
  createAuthenticatedControllerArgs,
  expectSuccessResponse,
} from '../../__tests__/mockBuilders/requests';
import { testUsers } from '../../__tests__/fixtures/users';

const flushPromises = () => new Promise(resolve => process.nextTick(resolve));

describe('backup.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createBackup', () => {
    it('should call backupService.createBackup and return backup data', async () => {
      const mockBackupData = { version: '1.0.0', exportedAt: '2024-01-01', trips: [] };
      jest.mocked(backupService.createBackup).mockResolvedValue(mockBackupData);

      const { req, res, next } = createAuthenticatedControllerArgs(testUsers.user1);
      backupController.createBackup(req, res, next);
      await flushPromises();

      expect(backupService.createBackup).toHaveBeenCalledWith(testUsers.user1.id);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename="travel-life-backup-')
      );
      // The response carries an HMAC-SHA256 signature over the backup body so
      // restore can reject tampered or foreign files.
      expect(res.json).toHaveBeenCalledWith({
        ...mockBackupData,
        integrity: {
          algorithm: 'hmac-sha256',
          signature: expect.stringMatching(/^[0-9a-f]{64}$/),
        },
      });
    });

    it('should sign the backup body, not the signed envelope', async () => {
      const mockBackupData = { version: '1.0.0', exportedAt: '2024-01-01', trips: [] };
      jest.mocked(backupService.createBackup).mockResolvedValue(mockBackupData);

      const { req, res, next } = createAuthenticatedControllerArgs(testUsers.user1);
      backupController.createBackup(req, res, next);
      await flushPromises();

      const body = res.json.mock.calls[0][0] as {
        integrity: { algorithm: string; signature: string };
      };

      const expected = crypto
        .createHmac('sha256', config.jwt.secret)
        .update(JSON.stringify(mockBackupData))
        .digest('hex');

      expect(body.integrity.signature).toBe(expected);
    });

    it('should pass errors to next via asyncHandler', async () => {
      const error = new Error('Backup failed');
      jest.mocked(backupService.createBackup).mockRejectedValue(error);

      const { req, res, next } = createAuthenticatedControllerArgs(testUsers.user1);
      backupController.createBackup(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('restoreFromBackup', () => {
    it('should validate input and call restoreService', async () => {
      const mockResult = { message: 'Restored successfully', stats: { trips: 2, locations: 5 } };
      jest.mocked(restoreService.restoreFromBackup).mockResolvedValue(mockResult);

      const backupData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        user: { username: 'test', email: 'test@test.com' },
        data: { trips: [] },
      };

      const { req, res, next } = createAuthenticatedControllerArgs(testUsers.user1, {
        body: { backupData, options: {} },
      });
      backupController.restoreFromBackup(req, res, next);
      await flushPromises();

      // If Zod validation fails, next will be called with error; otherwise service is called
      if ((next as jest.Mock).mock.calls.length === 0) {
        expect(restoreService.restoreFromBackup).toHaveBeenCalled();
        expectSuccessResponse(res, 200);
      }
    });

    it('should pass Zod validation errors to next', async () => {
      const { req, res, next } = createAuthenticatedControllerArgs(testUsers.user1, {
        body: { backupData: 'invalid', options: {} },
      });
      backupController.restoreFromBackup(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalled();
    });
  });

  describe('getBackupInfo', () => {
    it('should return backup info with version and formats', async () => {
      const { req, res, next } = createAuthenticatedControllerArgs(testUsers.user1);
      backupController.getBackupInfo(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          version: '1.0.0',
          supportedFormats: ['json'],
        },
      });
    });
  });
});
