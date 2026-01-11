import axiosInstance from '../lib/axios';
import type { BackupData, BackupInfo, RestoreOptions, RestoreResult, RestoreStats } from '../types/backup';

/**
 * Create and download a backup of all user data
 */
async function createBackup(): Promise<BackupData> {
  const response = await axiosInstance.post<BackupData>('/backup/create');
  return response.data;
}

/**
 * Download backup data as a JSON file
 */
function downloadBackupFile(backupData: BackupData): void {
  const dataStr = JSON.stringify(backupData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const filename = `travel-life-backup-${new Date().toISOString().split('T')[0]}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Restore user data from a backup file
 */
async function restoreFromBackup(
  backupData: BackupData,
  options: RestoreOptions
): Promise<RestoreResult> {
  const response = await axiosInstance.post<{ status: string; message: string; data: { stats: RestoreStats } }>(
    '/backup/restore',
    {
      backupData,
      options,
    }
  );

  return {
    success: response.data.status === 'success',
    message: response.data.message,
    stats: response.data.data.stats,
  };
}

/**
 * Get backup information/metadata
 */
async function getBackupInfo(): Promise<BackupInfo> {
  const response = await axiosInstance.get<{ status: string; data: BackupInfo }>('/backup/info');
  return response.data.data;
}

/**
 * Read and parse a backup file
 */
async function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backupData = JSON.parse(content) as BackupData;

        // Validate backup data structure
        if (!backupData.version || !backupData.user || !backupData.trips) {
          throw new Error('Invalid backup file format');
        }

        resolve(backupData);
      } catch (error) {
        reject(new Error('Failed to parse backup file: ' + (error as Error).message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read backup file'));
    };

    reader.readAsText(file);
  });
}

export default {
  createBackup,
  downloadBackupFile,
  restoreFromBackup,
  getBackupInfo,
  readBackupFile,
};
