import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted so the mock functions can be referenced directly in assertions.
// This keeps them typed as mocks throughout, avoiding a cast on every use.
const mockAxios = vi.hoisted(() => ({
  get: vi.fn<(url: string) => Promise<{ data: unknown }>>(),
  post: vi.fn<(url: string, body?: unknown) => Promise<{ data: unknown }>>(),
  put: vi.fn<(url: string, body?: unknown) => Promise<{ data: unknown }>>(),
  patch: vi.fn<(url: string, body?: unknown) => Promise<{ data: unknown }>>(),
  delete: vi.fn<(url: string) => Promise<{ data: unknown }>>(),
}));

vi.mock('../../lib/axios', () => ({ default: mockAxios }));

import backupService from '../backup.service';
import type { BackupData, BackupInfo, RestoreOptions, RestoreStats } from '../../types/backup';

/**
 * Builds a complete, valid backup payload. Overrides let each test vary the
 * fields it cares about without repeating the whole structure.
 */
function createBackupData(overrides: Partial<BackupData> = {}): BackupData {
  return {
    version: '1.0',
    exportDate: '2024-06-15T12:00:00Z',
    user: {
      username: 'testuser',
      email: 'testuser@example.com',
      timezone: 'America/New_York',
      activityCategories: [],
      immichApiUrl: null,
      immichApiKey: null,
      weatherApiKey: null,
    },
    tags: [],
    companions: [],
    locationCategories: [],
    checklists: [],
    trips: [{ id: 1, name: 'Trip 1' }],
    ...overrides,
  };
}

const restoreOptions: RestoreOptions = {
  clearExistingData: true,
  importPhotos: false,
};

const restoreStats: RestoreStats = {
  tripsImported: 1,
  locationsImported: 5,
  photosImported: 0,
  activitiesImported: 3,
  transportationImported: 2,
  lodgingImported: 1,
  journalEntriesImported: 4,
  tagsImported: 6,
  companionsImported: 2,
};

describe('backupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBackup', () => {
    it('should call POST /backup/create and return backup data', async () => {
      const mockBackupData = createBackupData();
      mockAxios.post.mockResolvedValue({ data: mockBackupData });

      const result = await backupService.createBackup();

      expect(mockAxios.post).toHaveBeenCalledWith('/backup/create');
      expect(mockAxios.post).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockBackupData);
    });

    it('should propagate errors on backup creation failure', async () => {
      const error = new Error('Server error');
      mockAxios.post.mockRejectedValue(error);

      await expect(backupService.createBackup()).rejects.toThrow('Server error');
    });
  });

  describe('downloadBackupFile', () => {
    it('should create a download link and trigger click', () => {
      const mockBackupData = createBackupData({ trips: [] });

      // Mock URL and DOM APIs
      const mockUrl = 'blob:http://localhost/mock-url';
      const mockCreateObjectURL = vi.fn(() => mockUrl);
      const mockRevokeObjectURL = vi.fn();
      globalThis.URL.createObjectURL = mockCreateObjectURL;
      globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

      // Build the anchor before spying so createElement still returns a real element
      const mockClick = vi.fn<() => void>();
      const mockAnchor = document.createElement('a');
      mockAnchor.click = mockClick;

      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      const mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
      vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

      backupService.downloadBackupFile(mockBackupData);

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalledTimes(1);
      expect(mockAppendChild).toHaveBeenCalledTimes(1);
      expect(mockRemoveChild).toHaveBeenCalledTimes(1);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockUrl);

      mockCreateElement.mockRestore();
    });
  });

  describe('restoreFromBackup', () => {
    it('should call POST /backup/restore with backup data and options', async () => {
      const backupData = createBackupData();
      const mockResult = {
        message: 'Restore completed successfully',
        stats: restoreStats,
      };
      mockAxios.post.mockResolvedValue({ data: mockResult });

      const result = await backupService.restoreFromBackup(backupData, restoreOptions);

      expect(mockAxios.post).toHaveBeenCalledWith('/backup/restore', {
        backupData,
        options: restoreOptions,
      });
      expect(mockAxios.post).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        message: 'Restore completed successfully',
        stats: restoreStats,
      });
    });

    it('should propagate errors on restore failure', async () => {
      const error = new Error('Invalid backup format');
      mockAxios.post.mockRejectedValue(error);

      await expect(
        backupService.restoreFromBackup(createBackupData(), restoreOptions)
      ).rejects.toThrow('Invalid backup format');
    });
  });

  describe('getBackupInfo', () => {
    it('should call GET /backup/info and return backup metadata', async () => {
      const mockInfo: BackupInfo = {
        version: '1.0',
        supportedFormats: ['1.0'],
      };
      mockAxios.get.mockResolvedValue({ data: mockInfo });

      const result = await backupService.getBackupInfo();

      expect(mockAxios.get).toHaveBeenCalledWith('/backup/info');
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockInfo);
    });

    it('should propagate errors on info fetch failure', async () => {
      const error = new Error('Unauthorized');
      mockAxios.get.mockRejectedValue(error);

      await expect(backupService.getBackupInfo()).rejects.toThrow('Unauthorized');
    });
  });

  describe('readBackupFile', () => {
    it('should read and parse a valid backup JSON file', async () => {
      const backupContent = createBackupData();
      const file = new File([JSON.stringify(backupContent)], 'backup.json', { type: 'application/json' });

      const result = await backupService.readBackupFile(file);

      expect(result).toEqual(backupContent);
    });

    it('should reject with error for invalid JSON', async () => {
      const file = new File(['not valid json'], 'backup.json', { type: 'application/json' });

      await expect(backupService.readBackupFile(file)).rejects.toThrow('Failed to parse backup file');
    });

    it('should reject with error for missing required fields', async () => {
      const invalidBackup = { someField: 'value' };
      const file = new File([JSON.stringify(invalidBackup)], 'backup.json', { type: 'application/json' });

      await expect(backupService.readBackupFile(file)).rejects.toThrow('Invalid backup file format');
    });

    it('should reject with error for file missing version field', async () => {
      const invalidBackup = { user: { id: 1 }, trips: [] };
      const file = new File([JSON.stringify(invalidBackup)], 'backup.json', { type: 'application/json' });

      await expect(backupService.readBackupFile(file)).rejects.toThrow('Invalid backup file format');
    });

    it('should reject with error for file missing user field', async () => {
      const invalidBackup = { version: '1.0', trips: [] };
      const file = new File([JSON.stringify(invalidBackup)], 'backup.json', { type: 'application/json' });

      await expect(backupService.readBackupFile(file)).rejects.toThrow('Invalid backup file format');
    });

    it('should reject with error for file missing trips field', async () => {
      const invalidBackup = { version: '1.0', user: { id: 1 } };
      const file = new File([JSON.stringify(invalidBackup)], 'backup.json', { type: 'application/json' });

      await expect(backupService.readBackupFile(file)).rejects.toThrow('Invalid backup file format');
    });
  });
});
