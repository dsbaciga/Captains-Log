import { useState, useEffect, useCallback, useRef } from 'react';
import offlineService from '../services/offline.service';
import syncManager from '../services/syncManager';

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
 * Custom event dispatched when offline/sync state changes within this tab.
 *
 * The real offline pipeline lives in IndexedDB (`syncQueue` / `trips` stores via
 * `offlineService`), which — unlike localStorage — emits no cross-tab `storage`
 * event. Anything that mutates the queue or the cached trip data should call
 * {@link notifyOfflineSyncUpdate} so mounted status components refresh.
 */
export const OFFLINE_SYNC_UPDATE_EVENT = 'offline-sync-update';

/**
 * Notify mounted offline-status components that the sync state changed.
 *
 * @param tripId - Optional trip the change relates to
 */
export function notifyOfflineSyncUpdate(tripId?: string): void {
  window.dispatchEvent(
    new CustomEvent(OFFLINE_SYNC_UPDATE_EVENT, { detail: { tripId } })
  );
}

const EMPTY_STATUS: OfflineStatus = {
  isOfflineReady: false,
  lastSynced: null,
  pendingChanges: 0,
  isSyncing: false,
  syncError: null,
};

export interface UseOfflineReadyOptions {
  /** Callback when sync starts */
  onSyncStart?: () => void;
  /** Callback when sync completes successfully */
  onSyncComplete?: () => void;
  /** Callback when sync fails */
  onSyncError?: (error: string) => void;
}

/**
 * Hook for checking if a specific trip is available offline.
 *
 * Reads directly from the real offline pipeline: the IndexedDB `trips` store
 * (cached data + last sync time) and the `syncQueue` store (pending changes),
 * both via `offlineService`. Sync progress and errors come from `syncManager`.
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

  const [status, setStatus] = useState<OfflineStatus>(EMPTY_STATUS);

  // Callbacks live in a ref so changing an inline arrow prop does not
  // re-subscribe the listeners on every render.
  const callbacksRef = useRef({ onSyncStart, onSyncComplete, onSyncError });
  callbacksRef.current = { onSyncStart, onSyncComplete, onSyncError };

  // Latest sync error reported by syncManager, kept outside setStatus so a
  // plain refresh does not clear it.
  const syncErrorRef = useRef<string | null>(null);

  /**
   * @param syncingOverride - The in-progress value observed at the moment this
   *   refresh was triggered. Passed by the sync-state subscription because the
   *   IndexedDB reads below take long enough that a short sync can finish
   *   first, which would sample the flag back at `false` and swallow the
   *   syncing state entirely.
   */
  const refresh = useCallback(async (syncingOverride?: boolean): Promise<void> => {
    if (!tripId) {
      setStatus(EMPTY_STATUS);
      return;
    }

    try {
      const [isCached, lastSync, pending] = await Promise.all([
        offlineService.isTripCached(tripId),
        offlineService.getLastSyncTime(tripId),
        offlineService.getPendingChangesForTrip(tripId),
      ]);

      const next: OfflineStatus = {
        isOfflineReady: isCached,
        lastSynced: lastSync ? new Date(lastSync) : null,
        pendingChanges: pending.length,
        isSyncing: syncingOverride ?? syncManager.isSyncInProgress(),
        syncError: syncErrorRef.current,
      };

      setStatus((prev) => {
        const { onSyncStart: start, onSyncComplete: complete, onSyncError: fail } =
          callbacksRef.current;

        if (next.isSyncing && !prev.isSyncing) {
          start?.();
        }
        if (!next.isSyncing && prev.isSyncing) {
          if (next.syncError) {
            fail?.(next.syncError);
          } else {
            complete?.();
          }
        }

        return next;
      });
    } catch (error) {
      console.error('Error reading offline trip status:', error);
    }
  }, [tripId]);

  // Refresh on mount and whenever the trip changes
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Refresh on sync completion and on explicit in-tab notifications
  useEffect(() => {
    const handleUpdate = () => {
      void refresh();
    };

    const unsubscribe = syncManager.onSyncComplete((result) => {
      syncErrorRef.current =
        result.status === 'error' ? result.error ?? 'Sync failed' : null;
      void refresh();
    });

    // Sync completion alone never reports `isSyncing: true` — by the time it
    // fires the run is over. Subscribing to the flag itself is what makes the
    // syncing states (and the onSyncStart callback) reachable at all.
    const unsubscribeSyncState = syncManager.onSyncStateChange((isSyncing) => {
      void refresh(isSyncing);
    });

    window.addEventListener(OFFLINE_SYNC_UPDATE_EVENT, handleUpdate);
    window.addEventListener('online', handleUpdate);

    return () => {
      unsubscribe();
      unsubscribeSyncState();
      window.removeEventListener(OFFLINE_SYNC_UPDATE_EVENT, handleUpdate);
      window.removeEventListener('online', handleUpdate);
    };
  }, [refresh]);

  return status;
}

/**
 * Hook for getting total pending changes count across all trips.
 *
 * Backed by the real IndexedDB `syncQueue` store via
 * `offlineService.getPendingChangeCount()`.
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
  const [totalPendingChanges, setTotalPendingChanges] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const count = await offlineService.getPendingChangeCount();
        if (!cancelled) {
          setTotalPendingChanges(count);
        }
      } catch (error) {
        console.error('Error reading pending change count:', error);
      }
    };

    void refresh();

    const handleUpdate = () => {
      void refresh();
    };

    const unsubscribe = syncManager.onSyncComplete(handleUpdate);
    window.addEventListener(OFFLINE_SYNC_UPDATE_EVENT, handleUpdate);
    window.addEventListener('online', handleUpdate);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener(OFFLINE_SYNC_UPDATE_EVENT, handleUpdate);
      window.removeEventListener('online', handleUpdate);
    };
  }, []);

  return { totalPendingChanges };
}

export default useOfflineReady;
