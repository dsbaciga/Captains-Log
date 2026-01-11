export interface BackupData {
  version: string;
  exportDate: string;
  user: {
    username: string;
    email: string;
    timezone: string | null;
    activityCategories: any[];
    immichApiUrl: string | null;
    immichApiKey: string | null;
    weatherApiKey: string | null;
  };
  tags: any[];
  companions: any[];
  locationCategories: any[];
  checklists: any[];
  trips: any[];
}

export interface BackupInfo {
  version: string;
  supportedFormats: string[];
}

export interface RestoreOptions {
  clearExistingData: boolean;
  importPhotos: boolean;
}

export interface RestoreStats {
  tripsImported: number;
  locationsImported: number;
  photosImported: number;
  activitiesImported: number;
  transportationImported: number;
  lodgingImported: number;
  journalEntriesImported: number;
  tagsImported: number;
  companionsImported: number;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  stats: RestoreStats;
}
