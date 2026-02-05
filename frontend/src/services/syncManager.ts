/**
 * Sync Manager
 *
 * Handles synchronization of offline changes with the server.
 * Includes conflict detection, retry logic with exponential backoff,
 * and CSRF token refresh before sync operations.
 *
 * IMPORTANT: Before starting any sync, always refresh the CSRF token first.
 */

import axiosInstance from '../lib/axios';
import { isAxiosError } from 'axios';
import { getDb } from '../lib/offlineDb';
import { offlineService } from './offline.service';
import type {
  SyncOperation,
  SyncEntityType,
  SyncConflict,
  ConflictResolution,
} from '../types/offline.types';

// Re-export types for convenience
export type { ConflictResolution };

/**
 * Result of a sync operation
 */
export interface SyncResult {
  status: 'complete' | 'partial' | 'offline' | 'error' | 'already-syncing';
  synced: number;
  failed: number;
  conflicts: ConflictInfo[];
  error?: string;
}

/**
 * Information about a sync conflict
 */
export interface ConflictInfo {
  entityType: SyncEntityType;
  entityId: string;
  localId?: string;
  tripId: string;
  localData: unknown;
  serverData: unknown;
  localTimestamp: number;
  serverTimestamp: number;
}

/**
 * Stored conflict for user resolution (extends SyncConflict from types)
 */
interface StoredConflict extends Omit<SyncConflict, 'id'> {
  id?: number;
}

/**
 * Retry configuration
 */
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second
const MAX_RETRY_DELAY_MS = 30000; // 30 seconds

/**
 * API endpoint mapping for entity types
 */
const ENTITY_ENDPOINTS: Record<SyncEntityType, string> = {
  trip: '/trips',
  location: '/locations',
  activity: '/activities',
  transportation: '/transportation',
  lodging: '/lodging',
  journal: '/journals',
  photo: '/photos',
  album: '/albums',
  checklist: '/checklists',
  checklistItem: '/checklist-items',
  entityLink: '/entity-links',
  tag: '/tags',
  tagAssignment: '/tag-assignments',
  companion: '/companions',
  tripCompanion: '/trip-companions',
  locationCategory: '/location-categories',
  weatherData: '/weather-data',
  flightTracking: '/flight-tracking',
  dismissedValidationIssue: '/dismissed-validation-issues',
};

/**
 * Calculate delay for exponential backoff
 */
function calculateBackoffDelay(retryCount: number): number {
  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
  // Add jitter (random factor) to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, MAX_RETRY_DELAY_MS);
}

/**
 * Delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class SyncManager {
  private isSyncing = false;
  private pendingConflicts: ConflictInfo[] = [];
  private syncListeners: Set<(result: SyncResult) => void> = new Set();

  /**
   * Refresh CSRF token before sync
   * CRITICAL: Must be called before any sync operation
   */
  private async refreshCsrfToken(): Promise<boolean> {
    try {
      await axiosInstance.get('/auth/csrf-token');
      return true;
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
      return false;
    }
  }

  /**
   * Sync all pending changes when online
   */
  async syncAll(): Promise<SyncResult> {
    // Check if already syncing
    if (this.isSyncing) {
      return { status: 'already-syncing', synced: 0, failed: 0, conflicts: [] };
    }

    // Check if offline
    if (!navigator.onLine) {
      return { status: 'offline', synced: 0, failed: 0, conflicts: [] };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      status: 'complete',
      synced: 0,
      failed: 0,
      conflicts: [],
    };

    try {
      // CRITICAL: Refresh CSRF token first
      const csrfRefreshed = await this.refreshCsrfToken();
      if (!csrfRefreshed) {
        return {
          status: 'error',
          synced: 0,
          failed: 0,
          conflicts: [],
          error: 'csrf-refresh-failed',
        };
      }

      // Get all pending changes
      const pending = await offlineService.getPendingChanges();

      if (pending.length === 0) {
        return result;
      }

      // Sort by timestamp to maintain order
      pending.sort((a, b) => a.timestamp - b.timestamp);

      // Process each change
      for (const change of pending) {
        try {
          const changeResult = await this.processChange(change);

          if (changeResult.conflict) {
            // Check if we can auto-resolve
            const resolution = this.autoResolve(changeResult.conflict);

            if (resolution === 'local') {
              // Push local change
              await this.pushChange(change, true);
              result.synced++;
            } else if (resolution === 'merge') {
              // Merge and push
              await this.pushMergedChange(change, changeResult.conflict);
              result.synced++;
            } else {
              // Requires user decision
              this.pendingConflicts.push(changeResult.conflict);
              result.conflicts.push(changeResult.conflict);
              await this.storeConflict(changeResult.conflict);
            }
          } else if (changeResult.success) {
            result.synced++;
          } else {
            result.failed++;
          }

          // Remove from queue after processing
          if (change.id !== undefined) {
            await offlineService.removeSyncedChange(change.id);
          }
        } catch (error) {
          console.error('Error processing change:', error);
          result.failed++;

          // Handle retry logic
          if (change.id !== undefined) {
            const newRetryCount = await offlineService.incrementRetryCount(change.id);

            if (newRetryCount >= MAX_RETRIES) {
              // Max retries exceeded, remove from queue and mark as failed
              await offlineService.removeSyncedChange(change.id);
              console.error(`Max retries exceeded for change ${change.id}`);
            }
          }
        }
      }

      // Update status based on results
      if (result.failed > 0 && result.synced > 0) {
        result.status = 'partial';
      } else if (result.failed > 0 && result.synced === 0) {
        result.status = 'error';
      }

      // Notify listeners
      this.notifyListeners(result);

      return result;
    } catch (error) {
      console.error('Sync error:', error);
      return {
        status: 'error',
        synced: result.synced,
        failed: result.failed,
        conflicts: result.conflicts,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a specific trip
   */
  async syncTrip(tripId: number | string): Promise<SyncResult> {
    if (!navigator.onLine) {
      return { status: 'offline', synced: 0, failed: 0, conflicts: [] };
    }

    const tripIdStr = String(tripId);

    // CRITICAL: Refresh CSRF token first
    const csrfRefreshed = await this.refreshCsrfToken();
    if (!csrfRefreshed) {
      return {
        status: 'error',
        synced: 0,
        failed: 0,
        conflicts: [],
        error: 'csrf-refresh-failed',
      };
    }

    const result: SyncResult = {
      status: 'complete',
      synced: 0,
      failed: 0,
      conflicts: [],
    };

    try {
      // Get pending changes for this trip
      const pending = await offlineService.getPendingChangesForTrip(tripIdStr);

      for (const change of pending) {
        try {
          const changeResult = await this.processChange(change);

          if (changeResult.success && !changeResult.conflict) {
            result.synced++;
            if (change.id !== undefined) {
              await offlineService.removeSyncedChange(change.id);
            }
          } else if (changeResult.conflict) {
            result.conflicts.push(changeResult.conflict);
          } else {
            result.failed++;
          }
        } catch (error) {
          result.failed++;
        }
      }

      // Update last sync time for the trip
      await offlineService.updateLastSyncTime(tripIdStr);

      return result;
    } catch (error) {
      return {
        status: 'error',
        synced: result.synced,
        failed: result.failed,
        conflicts: result.conflicts,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process a single sync operation
   */
  private async processChange(
    change: SyncOperation
  ): Promise<{ success: boolean; conflict?: ConflictInfo }> {
    const endpoint = ENTITY_ENDPOINTS[change.entityType];

    if (!endpoint) {
      console.error(`Unknown entity type: ${change.entityType}`);
      return { success: false };
    }

    // For updates and deletes, check server version first
    if (change.operation === 'update' || change.operation === 'delete') {
      const conflict = await this.checkForConflict(change);
      if (conflict) {
        return { success: false, conflict };
      }
    }

    return this.pushChange(change, false);
  }

  /**
   * Check if there's a conflict with server data
   */
  private async checkForConflict(change: SyncOperation): Promise<ConflictInfo | null> {
    const endpoint = ENTITY_ENDPOINTS[change.entityType];
    const entityId = parseInt(change.entityId, 10);

    // Handle trips differently as they don't have a tripId prefix in the URL
    let url: string;
    if (change.entityType === 'trip') {
      url = `${endpoint}/${entityId}`;
    } else {
      url = `${endpoint}/${entityId}`;
    }

    try {
      const response = await axiosInstance.get(url);
      const serverData = response.data.data;

      if (!serverData) {
        // Entity was deleted on server
        return {
          entityType: change.entityType,
          entityId: change.entityId,
          localId: change.localId,
          tripId: change.tripId,
          localData: change.data,
          serverData: null,
          localTimestamp: change.timestamp,
          serverTimestamp: 0,
        };
      }

      // Check if server version is newer
      const serverTimestamp = new Date(serverData.updatedAt).getTime();

      if (serverTimestamp > change.timestamp) {
        // Server has newer data - potential conflict
        return {
          entityType: change.entityType,
          entityId: change.entityId,
          localId: change.localId,
          tripId: change.tripId,
          localData: change.data,
          serverData,
          localTimestamp: change.timestamp,
          serverTimestamp,
        };
      }

      return null;
    } catch (error) {
      // If we can't fetch, assume no conflict (will fail on update if there is one)
      if (isAxiosError(error) && error.response?.status === 404) {
        // Entity not found - deleted on server
        return {
          entityType: change.entityType,
          entityId: change.entityId,
          localId: change.localId,
          tripId: change.tripId,
          localData: change.data,
          serverData: null,
          localTimestamp: change.timestamp,
          serverTimestamp: 0,
        };
      }
      return null;
    }
  }

  /**
   * Push a change to the server
   */
  private async pushChange(
    change: SyncOperation,
    forceOverwrite: boolean
  ): Promise<{ success: boolean }> {
    const endpoint = ENTITY_ENDPOINTS[change.entityType];
    const entityId = parseInt(change.entityId, 10);

    try {
      switch (change.operation) {
        case 'create': {
          // For trip creation, use base endpoint
          if (change.entityType === 'trip') {
            await axiosInstance.post(endpoint, change.data);
          } else {
            // For other entities, include tripId in the data
            await axiosInstance.post(endpoint, {
              ...change.data as Record<string, unknown>,
              tripId: parseInt(change.tripId, 10),
            });
          }
          break;
        }

        case 'update': {
          const url = `${endpoint}/${entityId}`;
          await axiosInstance.put(url, change.data);
          break;
        }

        case 'delete': {
          const url = `${endpoint}/${entityId}`;
          await axiosInstance.delete(url);
          break;
        }
      }

      return { success: true };
    } catch (error) {
      console.error(`Failed to push ${change.operation} for ${change.entityType}:`, error);

      // Handle specific error cases
      if (isAxiosError(error)) {
        if (error.response?.status === 409) {
          // Conflict response from server
          console.warn('Server reported conflict');
        } else if (error.response?.status === 401) {
          // Auth expired - need to re-authenticate
          console.warn('Authentication expired');
        }
      }

      return { success: false };
    }
  }

  /**
   * Push a merged change to the server
   */
  private async pushMergedChange(
    change: SyncOperation,
    conflict: ConflictInfo
  ): Promise<{ success: boolean }> {
    const mergedData = this.mergeChanges(
      change.data as Record<string, unknown>,
      conflict.serverData as Record<string, unknown>
    );

    const mergedChange: SyncOperation = {
      ...change,
      data: mergedData,
    };

    return this.pushChange(mergedChange, true);
  }

  /**
   * Auto-resolve obvious conflicts
   */
  private autoResolve(conflict: ConflictInfo): ConflictResolution | null {
    // If server data is null (deleted), use local
    if (conflict.serverData === null) {
      return 'local';
    }

    // If server hasn't changed since local change, use local
    if (conflict.serverTimestamp < conflict.localTimestamp) {
      return 'local';
    }

    // If only metadata changed (not content), merge
    if (this.isMetadataOnlyChange(conflict)) {
      return 'merge';
    }

    // Require user decision for content conflicts
    return null;
  }

  /**
   * Check if only metadata fields changed
   */
  private isMetadataOnlyChange(conflict: ConflictInfo): boolean {
    const metadataFields = ['updatedAt', 'version', 'lastSync', 'createdAt'];
    const local = conflict.localData as Record<string, unknown>;
    const server = conflict.serverData as Record<string, unknown>;

    if (!local || !server) return false;

    for (const key of Object.keys(local)) {
      if (metadataFields.includes(key)) continue;
      if (JSON.stringify(local[key]) !== JSON.stringify(server[key])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Merge non-conflicting fields
   */
  private mergeChanges(
    local: Record<string, unknown>,
    server: Record<string, unknown>
  ): Record<string, unknown> {
    const merged = { ...server };

    for (const [key, value] of Object.entries(local)) {
      // Skip metadata fields
      if (['id', 'updatedAt', 'createdAt', 'version'].includes(key)) {
        continue;
      }

      // Keep local changes for fields that didn't change on server
      if (JSON.stringify(server[key]) === JSON.stringify(value)) {
        continue;
      }

      // Local wins for user-editable text fields
      if (typeof value === 'string' && key !== 'id') {
        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * Store a conflict for user resolution
   */
  private async storeConflict(conflict: ConflictInfo): Promise<void> {
    const db = await getDb();
    await db.add('syncConflicts', {
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      localData: conflict.localData,
      serverData: conflict.serverData,
      localTimestamp: conflict.localTimestamp,
      serverTimestamp: conflict.serverTimestamp,
      status: 'pending',
    });
  }

  /**
   * Get all pending conflicts for user resolution
   */
  async getPendingConflicts(): Promise<StoredConflict[]> {
    const db = await getDb();
    const all = await db.getAll('syncConflicts');
    return all.filter(c => c.status === 'pending');
  }

  /**
   * Resolve a conflict with user's decision
   */
  async resolveConflict(
    conflictId: number,
    resolution: ConflictResolution
  ): Promise<{ success: boolean }> {
    const db = await getDb();
    const conflict = await db.get('syncConflicts', conflictId);

    if (!conflict) {
      return { success: false };
    }

    try {
      const endpoint = ENTITY_ENDPOINTS[conflict.entityType as SyncEntityType];
      const entityId = parseInt(conflict.entityId, 10);

      if (resolution === 'local') {
        // Push local changes
        await axiosInstance.put(`${endpoint}/${entityId}`, conflict.localData);
      } else if (resolution === 'merge') {
        // Merge and push
        const merged = this.mergeChanges(
          conflict.localData as Record<string, unknown>,
          conflict.serverData as Record<string, unknown>
        );
        await axiosInstance.put(`${endpoint}/${entityId}`, merged);
      }
      // For 'server', we don't need to do anything - server version is already current

      // Mark conflict as resolved
      await db.put('syncConflicts', {
        ...conflict,
        status: 'resolved',
        resolution,
        resolvedAt: Date.now(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error resolving conflict:', error);
      return { success: false };
    }
  }

  /**
   * Register a listener for sync results
   */
  onSyncComplete(listener: (result: SyncResult) => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  /**
   * Notify all listeners of sync result
   */
  private notifyListeners(result: SyncResult): void {
    this.syncListeners.forEach(listener => listener(result));
  }

  /**
   * Get sync status
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Retry a failed sync operation
   */
  async retrySync(operationId: number): Promise<{ success: boolean }> {
    const db = await getDb();
    const operation = await db.get('syncQueue', operationId);

    if (!operation) {
      return { success: false };
    }

    // Reset retry count
    await offlineService.updateSyncOperation(operationId, { retryCount: 0 });

    // Process the change
    const result = await this.processChange(operation);

    if (result.success && !result.conflict) {
      await offlineService.removeSyncedChange(operationId);
    }

    return { success: result.success };
  }

  /**
   * Cancel a pending sync operation
   */
  async cancelSync(operationId: number): Promise<void> {
    await offlineService.removeSyncedChange(operationId);
  }

  /**
   * Schedule automatic sync when online
   */
  scheduleAutoSync(): () => void {
    const handleOnline = () => {
      // Delay slightly to ensure connection is stable
      setTimeout(() => {
        this.syncAll().catch(console.error);
      }, 2000);
    };

    window.addEventListener('online', handleOnline);

    // Also sync on app visibility change (user returns to app)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        this.syncAll().catch(console.error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }
}

// Export singleton instance
export const syncManager = new SyncManager();
export default syncManager;
