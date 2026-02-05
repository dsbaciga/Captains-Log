import { useState, useEffect, useCallback } from 'react';

/**
 * Offline data status for a trip
 */
export interface OfflineStatus {
  /** Whether the trip data is available offline */
  isOfflineReady: boolean;
  /** Timestamp when data was last synced */
  lastSynced: Date | null;
  /** Number of pending changes waiting to sync */
  pendingChanges: number;
  /** Whether the trip is currently being synced */
  isSyncing: boolean;
  /** Error message if sync failed */
  syncError: string | null;
}

/**
 * Storage keys for offline data
 */
const OFFLINE_DATA_KEY = 'travel-life-offline-data';
const PENDING_CHANGES_KEY = 'travel-life-pending-changes';
const SYNC_STATUS_KEY = 'travel-life-sync-status';

interface OfflineTripData {
  tripId: string;
  lastSynced: string;
  data: unknown;
}

interface PendingChange {
  id: string;
  tripId: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  data: unknown;
  createdAt: string;
}

interface SyncStatus {
  tripId: string;
  isSyncing: boolean;
  lastError: string | null;
  lastErrorAt: string | null;
}

/**
 * Get offline trip data from localStorage
 */
function getOfflineTripData(tripId: string): OfflineTripData | null {
  try {
    const stored = localStorage.getItem(OFFLINE_DATA_KEY);
    if (!stored) return null;

    const data: Record<string, OfflineTripData> = JSON.parse(stored);
    return data[tripId] || null;
  } catch (error) {
    console.error('Error reading offline trip data:', error);
    return null;
  }
}

/**
 * Get pending changes for a trip from localStorage
 */
function getPendingChanges(tripId?: string): PendingChange[] {
  try {
    const stored = localStorage.getItem(PENDING_CHANGES_KEY);
    if (!stored) return [];

    const changes: PendingChange[] = JSON.parse(stored);
    if (tripId) {
      return changes.filter((change) => change.tripId === tripId);
    }
    return changes;
  } catch (error) {
    console.error('Error reading pending changes:', error);
    return [];
  }
}

/**
 * Get sync status for a trip from localStorage
 */
function getSyncStatus(tripId: string): SyncStatus | null {
  try {
    const stored = localStorage.getItem(SYNC_STATUS_KEY);
    if (!stored) return null;

    const statuses: Record<string, SyncStatus> = JSON.parse(stored);
    return statuses[tripId] || null;
  } catch (error) {
    console.error('Error reading sync status:', error);
    return null;
  }
}

/**
 * Save sync status for a trip to localStorage
 */
function saveSyncStatus(tripId: string, status: Partial<SyncStatus>): void {
  try {
    const stored = localStorage.getItem(SYNC_STATUS_KEY);
    const statuses: Record<string, SyncStatus> = stored ? JSON.parse(stored) : {};

    statuses[tripId] = {
      tripId,
      isSyncing: false,
      lastError: null,
      lastErrorAt: null,
      ...statuses[tripId],
      ...status,
    };

    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(statuses));
  } catch (error) {
    console.error('Error saving sync status:', error);
  }
}

export interface UseOfflineReadyOptions {
  /** Callback when sync starts */
  onSyncStart?: () => void;
  /** Callback when sync completes successfully */
  onSyncComplete?: () => void;
  /** Callback when sync fails */
  onSyncError?: (error: string) => void;
}

/**
 * Hook for checking if a specific trip is available offline
 *
 * Tracks offline availability, last sync time, and pending changes.
 * Works with the service worker and IndexedDB for actual offline storage.
 *
 * @param tripId - The ID of the trip to check
 * @param options - Optional callbacks for sync events
 *
 * @example
 * ```tsx
 * const {
 *   isOfflineReady,
 *   lastSynced,
 *   pendingChanges,
 *   isSyncing,
 *   syncError,
 * } = useOfflineReady(tripId);
 *
 * if (!isOfflineReady) {
 *   return <DownloadForOfflineButton tripId={tripId} />;
 * }
 *
 * if (pendingChanges > 0) {
 *   return <PendingChangesWarning count={pendingChanges} />;
 * }
 * ```
 */
export function useOfflineReady(
  tripId: string | undefined,
  options: UseOfflineReadyOptions = {}
): OfflineStatus {
  const { onSyncStart, onSyncComplete, onSyncError } = options;

  const buildStatus = useCallback((): OfflineStatus => {
    if (!tripId) {
      return {
        isOfflineReady: false,
        lastSynced: null,
        pendingChanges: 0,
        isSyncing: false,
        syncError: null,
      };
    }

    const offlineData = getOfflineTripData(tripId);
    const pendingChanges = getPendingChanges(tripId);
    const syncStatus = getSyncStatus(tripId);

    return {
      isOfflineReady: !!offlineData,
      lastSynced: offlineData ? new Date(offlineData.lastSynced) : null,
      pendingChanges: pendingChanges.length,
      isSyncing: syncStatus?.isSyncing ?? false,
      syncError: syncStatus?.lastError ?? null,
    };
  }, [tripId]);

  const [status, setStatus] = useState<OfflineStatus>(buildStatus);

  // Refresh status when tripId changes
  useEffect(() => {
    setStatus(buildStatus());
  }, [buildStatus]);

  // Listen for storage changes (from other tabs or service worker)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === OFFLINE_DATA_KEY ||
        event.key === PENDING_CHANGES_KEY ||
        event.key === SYNC_STATUS_KEY
      ) {
        const newStatus = buildStatus();
        setStatus((prev) => {
          // Trigger callbacks on status changes
          if (newStatus.isSyncing && !prev.isSyncing) {
            onSyncStart?.();
          }
          if (!newStatus.isSyncing && prev.isSyncing) {
            if (newStatus.syncError) {
              onSyncError?.(newStatus.syncError);
            } else {
              onSyncComplete?.();
            }
          }
          return newStatus;
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [buildStatus, onSyncStart, onSyncComplete, onSyncError]);

  // Listen for custom sync events from service worker
  useEffect(() => {
    const handleSyncEvent = (event: CustomEvent) => {
      if (event.detail?.tripId === tripId) {
        setStatus(buildStatus());
      }
    };

    window.addEventListener('offline-sync-update' as keyof WindowEventMap, handleSyncEvent as EventListener);
    return () => {
      window.removeEventListener('offline-sync-update' as keyof WindowEventMap, handleSyncEvent as EventListener);
    };
  }, [buildStatus, tripId]);

  return status;
}

/**
 * Hook for getting total pending changes count across all trips
 *
 * @example
 * ```tsx
 * const { totalPendingChanges } = useTotalPendingChanges();
 *
 * if (totalPendingChanges > 0) {
 *   return <Badge count={totalPendingChanges} />;
 * }
 * ```
 */
export function useTotalPendingChanges(): { totalPendingChanges: number } {
  const [totalPendingChanges, setTotalPendingChanges] = useState(() => {
    return getPendingChanges().length;
  });

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === PENDING_CHANGES_KEY) {
        setTotalPendingChanges(getPendingChanges().length);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { totalPendingChanges };
}

/**
 * Utility functions for managing offline data (to be used by sync service)
 */
export const offlineStorage = {
  /**
   * Mark trip data as available offline
   */
  saveTripOffline: (tripId: string, data: unknown): void => {
    try {
      const stored = localStorage.getItem(OFFLINE_DATA_KEY);
      const allData: Record<string, OfflineTripData> = stored ? JSON.parse(stored) : {};

      allData[tripId] = {
        tripId,
        lastSynced: new Date().toISOString(),
        data,
      };

      localStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(allData));

      // Dispatch custom event for same-tab updates
      window.dispatchEvent(
        new CustomEvent('offline-sync-update', { detail: { tripId } })
      );
    } catch (error) {
      console.error('Error saving trip offline:', error);
    }
  },

  /**
   * Remove trip from offline storage
   */
  removeTripOffline: (tripId: string): void => {
    try {
      const stored = localStorage.getItem(OFFLINE_DATA_KEY);
      if (!stored) return;

      const allData: Record<string, OfflineTripData> = JSON.parse(stored);
      delete allData[tripId];

      localStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(allData));

      // Dispatch custom event for same-tab updates
      window.dispatchEvent(
        new CustomEvent('offline-sync-update', { detail: { tripId } })
      );
    } catch (error) {
      console.error('Error removing trip offline:', error);
    }
  },

  /**
   * Add a pending change
   */
  addPendingChange: (change: Omit<PendingChange, 'id' | 'createdAt'>): void => {
    try {
      const stored = localStorage.getItem(PENDING_CHANGES_KEY);
      const changes: PendingChange[] = stored ? JSON.parse(stored) : [];

      changes.push({
        ...change,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      });

      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(changes));

      // Dispatch custom event for same-tab updates
      window.dispatchEvent(
        new CustomEvent('offline-sync-update', { detail: { tripId: change.tripId } })
      );
    } catch (error) {
      console.error('Error adding pending change:', error);
    }
  },

  /**
   * Remove a pending change by ID
   */
  removePendingChange: (changeId: string): void => {
    try {
      const stored = localStorage.getItem(PENDING_CHANGES_KEY);
      if (!stored) return;

      const changes: PendingChange[] = JSON.parse(stored);
      const filtered = changes.filter((c) => c.id !== changeId);

      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(filtered));

      // Dispatch custom event for same-tab updates
      const removedChange = changes.find((c) => c.id === changeId);
      if (removedChange) {
        window.dispatchEvent(
          new CustomEvent('offline-sync-update', { detail: { tripId: removedChange.tripId } })
        );
      }
    } catch (error) {
      console.error('Error removing pending change:', error);
    }
  },

  /**
   * Clear all pending changes for a trip
   */
  clearPendingChanges: (tripId: string): void => {
    try {
      const stored = localStorage.getItem(PENDING_CHANGES_KEY);
      if (!stored) return;

      const changes: PendingChange[] = JSON.parse(stored);
      const filtered = changes.filter((c) => c.tripId !== tripId);

      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(filtered));

      // Dispatch custom event for same-tab updates
      window.dispatchEvent(
        new CustomEvent('offline-sync-update', { detail: { tripId } })
      );
    } catch (error) {
      console.error('Error clearing pending changes:', error);
    }
  },

  /**
   * Set syncing status for a trip
   */
  setSyncing: (tripId: string, isSyncing: boolean): void => {
    saveSyncStatus(tripId, { isSyncing });

    // Dispatch custom event for same-tab updates
    window.dispatchEvent(
      new CustomEvent('offline-sync-update', { detail: { tripId } })
    );
  },

  /**
   * Set sync error for a trip
   */
  setSyncError: (tripId: string, error: string | null): void => {
    saveSyncStatus(tripId, {
      lastError: error,
      lastErrorAt: error ? new Date().toISOString() : null,
      isSyncing: false,
    });

    // Dispatch custom event for same-tab updates
    window.dispatchEvent(
      new CustomEvent('offline-sync-update', { detail: { tripId } })
    );
  },

  /**
   * Get all pending changes
   */
  getAllPendingChanges: getPendingChanges,

  /**
   * Get offline data for a trip
   */
  getOfflineTripData,
};

export default useOfflineReady;
