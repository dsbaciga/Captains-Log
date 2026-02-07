import { z } from 'zod';

// Backup file format version
// v1.1.0 - Added travelDocuments and tripLanguages
// v1.2.0 - Added tripTypes and tripSeries
export const BACKUP_VERSION = '1.2.0';

// Backup data structure schema
export const BackupDataSchema = z.object({
  version: z.string(),
  exportDate: z.string(), // ISO 8601 date string
  user: z.object({
    username: z.string(),
    email: z.string(),
    timezone: z.string().nullable(),
    activityCategories: z.array(z.any()),
    tripTypes: z.array(z.any()).optional(),
    immichApiUrl: z.string().nullable(),
    immichApiKey: z.string().nullable(),
    weatherApiKey: z.string().nullable(),
    aviationstackApiKey: z.string().nullable().optional(),
    openrouteserviceApiKey: z.string().nullable().optional(),
  }),
  tags: z.array(z.any()),
  companions: z.array(z.any()),
  locationCategories: z.array(z.any()),
  checklists: z.array(z.any()),
  // Travel documents (added in v1.1.0)
  travelDocuments: z.array(z.any()).optional(),
  // Trip series (added in v1.2.0)
  tripSeries: z.array(z.any()).optional(),
  trips: z.array(z.any()),
});

export type BackupData = z.infer<typeof BackupDataSchema>;

// Response types
export const BackupInfoResponseSchema = z.object({
  hasBackup: z.boolean(),
  lastBackupDate: z.string().nullable(),
  backupSize: z.number().nullable(),
});

export type BackupInfoResponse = z.infer<typeof BackupInfoResponseSchema>;

// Restore options
export const RestoreOptionsSchema = z.object({
  clearExistingData: z.boolean().default(true),
  importPhotos: z.boolean().default(true),
});

export type RestoreOptions = z.infer<typeof RestoreOptionsSchema>;

// Progress callback type
export type ProgressCallback = (progress: number, message: string) => void;
