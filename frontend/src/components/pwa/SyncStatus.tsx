import { useState, useCallback } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useOfflineReady, offlineStorage } from '../../hooks/useOfflineReady';

/**
 * Sync status states
 */
export type SyncState = 'idle' | 'syncing' | 'synced' | 'pending' | 'error';

export interface SyncStatusProps {
  /** Trip ID to show sync status for */
  tripId?: string;
  /** Callback to trigger sync - receives tripId if provided */
  onSync?: (tripId?: string) => Promise<void>;
  /** Whether to show as compact badge */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * SyncStatus shows the synchronization status for trip data.
 *
 * Features:
 * - Shows current sync state (syncing, synced, pending changes, error)
 * - "Sync Now" button when online with pending changes
 * - Progress indicator during sync
 * - Error state with retry option
 * - Compact badge mode for tight spaces
 *
 * @example
 * ```tsx
 * // Full sync status with sync action
 * <SyncStatus
 *   tripId={tripId}
 *   onSync={handleSync}
 * />
 *
 * // Compact badge mode
 * <SyncStatus tripId={tripId} compact />
 * ```
 */
export default function SyncStatus({
  tripId,
  onSync,
  compact = false,
  className = '',
}: SyncStatusProps) {
  const { isOnline } = useNetworkStatus();
  const {
    isOfflineReady,
    lastSynced,
    pendingChanges,
    isSyncing,
    syncError,
  } = useOfflineReady(tripId);

  const [localSyncing, setLocalSyncing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Determine current state
  const getSyncState = (): SyncState => {
    if (isSyncing || localSyncing) return 'syncing';
    if (syncError || localError) return 'error';
    if (pendingChanges > 0) return 'pending';
    if (isOfflineReady && lastSynced) return 'synced';
    return 'idle';
  };

  const state = getSyncState();

  // Handle sync action
  const handleSync = useCallback(async () => {
    if (!isOnline || isSyncing || localSyncing) return;

    setLocalSyncing(true);
    setLocalError(null);

    // Update storage to show syncing state
    if (tripId) {
      offlineStorage.setSyncing(tripId, true);
    }

    try {
      if (onSync) {
        await onSync(tripId);
      } else {
        // Simulate sync if no handler provided
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Clear pending changes on success
      if (tripId) {
        offlineStorage.clearPendingChanges(tripId);
        offlineStorage.setSyncing(tripId, false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setLocalError(errorMessage);

      if (tripId) {
        offlineStorage.setSyncError(tripId, errorMessage);
      }
    } finally {
      setLocalSyncing(false);
    }
  }, [isOnline, isSyncing, localSyncing, onSync, tripId]);

  // Clear error
  const clearError = useCallback(() => {
    setLocalError(null);
    if (tripId) {
      offlineStorage.setSyncError(tripId, null);
    }
  }, [tripId]);

  // Compact badge mode
  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 ${className}`}
        role="status"
        aria-live="polite"
      >
        {state === 'syncing' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-gold">
            <svg
              className="w-3 h-3 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Syncing
          </span>
        )}

        {state === 'synced' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Synced
          </span>
        )}

        {state === 'pending' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
            <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse-subtle" />
            {pendingChanges} pending
          </span>
        )}

        {state === 'error' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Error
          </span>
        )}
      </div>
    );
  }

  // Full sync status display
  return (
    <div
      className={`
        rounded-xl p-4
        bg-white/80 dark:bg-navy-800/90
        border border-primary-100 dark:border-gold/20
        backdrop-blur-sm
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Status info */}
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <div
            className={`
              flex items-center justify-center w-10 h-10 rounded-full
              ${state === 'syncing' ? 'bg-primary-100 dark:bg-primary-900/40' : ''}
              ${state === 'synced' ? 'bg-emerald-100 dark:bg-emerald-900/40' : ''}
              ${state === 'pending' ? 'bg-amber-100 dark:bg-amber-900/40' : ''}
              ${state === 'error' ? 'bg-red-100 dark:bg-red-900/40' : ''}
              ${state === 'idle' ? 'bg-parchment dark:bg-navy-700' : ''}
            `}
          >
            {state === 'syncing' && (
              <svg
                className="w-5 h-5 text-primary-600 dark:text-gold animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}

            {state === 'synced' && (
              <svg
                className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}

            {state === 'pending' && (
              <svg
                className="w-5 h-5 text-amber-600 dark:text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}

            {state === 'error' && (
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}

            {state === 'idle' && (
              <svg
                className="w-5 h-5 text-slate dark:text-warm-gray"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
          </div>

          {/* Status text */}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-charcoal dark:text-warm-gray">
              {state === 'syncing' && 'Syncing...'}
              {state === 'synced' && 'All changes synced'}
              {state === 'pending' && `${pendingChanges} pending ${pendingChanges === 1 ? 'change' : 'changes'}`}
              {state === 'error' && 'Sync failed'}
              {state === 'idle' && 'Not synced'}
            </span>

            {/* Error message */}
            {state === 'error' && (syncError || localError) && (
              <span className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                {syncError || localError}
              </span>
            )}

            {/* Last synced time */}
            {lastSynced && state !== 'error' && (
              <span className="text-xs text-slate dark:text-warm-gray/70 mt-0.5">
                Last synced {formatTimeAgo(lastSynced)}
              </span>
            )}

            {/* Offline message */}
            {!isOnline && pendingChanges > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Will sync when online
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Sync Now button */}
          {state === 'pending' && isOnline && (
            <button
              onClick={handleSync}
              disabled={isSyncing || localSyncing}
              className="
                inline-flex items-center gap-1.5 px-3 py-1.5
                text-sm font-medium rounded-lg
                bg-primary-500 dark:bg-gold
                text-white dark:text-navy-900
                hover:bg-primary-600 dark:hover:bg-amber-400
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200
                focus-visible:ring-2 focus-visible:ring-primary-500/50 dark:focus-visible:ring-gold/50
                min-w-[44px] min-h-[44px]
              "
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Sync Now
            </button>
          )}

          {/* Retry button for errors */}
          {state === 'error' && isOnline && (
            <button
              onClick={handleSync}
              disabled={isSyncing || localSyncing}
              className="
                inline-flex items-center gap-1.5 px-3 py-1.5
                text-sm font-medium rounded-lg
                bg-red-100 dark:bg-red-900/30
                text-red-700 dark:text-red-300
                hover:bg-red-200 dark:hover:bg-red-900/50
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200
                focus-visible:ring-2 focus-visible:ring-red-500/50
                min-w-[44px] min-h-[44px]
              "
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retry
            </button>
          )}

          {/* Dismiss error button */}
          {state === 'error' && (
            <button
              onClick={clearError}
              className="
                p-1.5 rounded-lg
                text-slate dark:text-warm-gray/70
                hover:bg-parchment dark:hover:bg-navy-700
                transition-colors duration-200
                focus-visible:ring-2 focus-visible:ring-primary-500/50 dark:focus-visible:ring-gold/50
                min-w-[44px] min-h-[44px]
                flex items-center justify-center
              "
              aria-label="Dismiss error"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress bar during sync */}
      {state === 'syncing' && (
        <div className="mt-3 h-1 bg-primary-100 dark:bg-navy-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 dark:bg-gold rounded-full animate-pulse"
            style={{ width: '60%' }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Format a date as relative time (e.g., "5 minutes ago")
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}
