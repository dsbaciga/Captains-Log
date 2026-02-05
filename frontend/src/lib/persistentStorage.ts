/**
 * Persistent Storage Utilities
 *
 * Handles requesting persistent storage and getting storage information.
 * Special handling for iOS which doesn't fully support the Persistent Storage API.
 *
 * Key concepts:
 * - Persistent storage prevents browser from evicting data under storage pressure
 * - iOS does not support persistent storage API - data can be evicted after 7 days of inactivity
 * - Chrome auto-grants persistence for installed PWAs
 * - Firefox prompts the user for permission
 */

export interface StorageInfo {
  /** Total storage usage in bytes */
  usage: number;
  /** Storage quota in bytes */
  quota: number;
  /** Percentage of quota used (0-100) */
  percentUsed: number;
  /** Whether storage is persistent (immune to eviction) */
  isPersistent: boolean;
  /** Breakdown by storage type (if available) */
  breakdown: StorageBreakdown | null;
}

export interface StorageBreakdown {
  /** IndexedDB usage in bytes */
  indexedDB: number;
  /** Cache API usage in bytes */
  cacheStorage: number;
  /** Service Worker usage in bytes */
  serviceWorker: number;
  /** Other/unknown usage in bytes */
  other: number;
}

/**
 * Request persistent storage permission.
 *
 * When granted, the browser won't automatically evict the site's data
 * when storage is running low.
 *
 * Behavior by browser:
 * - Chrome: Auto-grants for installed PWAs, engagement metrics for web
 * - Firefox: Shows permission prompt to user
 * - Safari: Not supported - always returns false
 * - iOS Safari: Not supported - data may be evicted after 7 days
 *
 * @returns Promise that resolves to true if persistence is granted
 *
 * @example
 * ```tsx
 * const granted = await requestPersistentStorage();
 * if (granted) {
 *   console.log('Storage is persistent');
 * } else {
 *   console.log('Storage may be evicted under pressure');
 * }
 * ```
 */
export async function requestPersistentStorage(): Promise<boolean> {
  // Check if API is supported
  if (!navigator.storage || !navigator.storage.persist) {
    console.warn('Persistent Storage API not supported');
    return false;
  }

  try {
    // Check if already persistent
    const alreadyPersisted = await navigator.storage.persisted();
    if (alreadyPersisted) {
      return true;
    }

    // Request persistence
    const granted = await navigator.storage.persist();

    if (!granted) {
      console.warn(
        'Persistent storage not granted. Data may be evicted under storage pressure.'
      );
    }

    return granted;
  } catch (error) {
    console.error('Failed to request persistent storage:', error);
    return false;
  }
}

/**
 * Check if storage is currently persistent.
 *
 * @returns Promise that resolves to true if storage is persistent
 *
 * @example
 * ```tsx
 * const persisted = await isPersisted();
 * if (!persisted) {
 *   // Show warning to user
 * }
 * ```
 */
export async function isPersisted(): Promise<boolean> {
  if (!navigator.storage || !navigator.storage.persisted) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch (error) {
    console.error('Failed to check persistence status:', error);
    return false;
  }
}

/**
 * Get detailed storage information including breakdown by category.
 *
 * Note: Breakdown is only available in Chrome. Other browsers return null.
 *
 * @returns Promise with detailed storage information
 *
 * @example
 * ```tsx
 * const info = await getStorageInfo();
 * console.log(`Using ${info.usage} of ${info.quota} bytes`);
 * console.log(`Persistent: ${info.isPersistent}`);
 *
 * if (info.breakdown) {
 *   console.log(`IndexedDB: ${info.breakdown.indexedDB} bytes`);
 *   console.log(`Cache: ${info.breakdown.cacheStorage} bytes`);
 * }
 * ```
 */
export async function getStorageInfo(): Promise<StorageInfo> {
  const defaultInfo: StorageInfo = {
    usage: 0,
    quota: 0,
    percentUsed: 0,
    isPersistent: false,
    breakdown: null,
  };

  // Check API support
  if (!navigator.storage || !navigator.storage.estimate) {
    return defaultInfo;
  }

  try {
    const [estimate, persisted] = await Promise.all([
      navigator.storage.estimate(),
      isPersisted(),
    ]);

    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

    // Extract breakdown if available (Chrome only)
    // Type assertion needed as usageDetails is not in standard TypeScript types
    const breakdown = extractBreakdown(estimate as StorageEstimateWithDetails);

    return {
      usage,
      quota,
      percentUsed,
      isPersistent: persisted,
      breakdown,
    };
  } catch (error) {
    console.error('Failed to get storage info:', error);
    return defaultInfo;
  }
}

/**
 * Clear all cached data for the application.
 *
 * This includes:
 * - Cache API (Service Worker caches)
 * - IndexedDB databases owned by the app
 *
 * Does NOT clear:
 * - localStorage
 * - sessionStorage
 * - Cookies
 *
 * @returns Promise with bytes freed
 *
 * @example
 * ```tsx
 * const bytesFreed = await clearAllCaches();
 * console.log(`Freed ${bytesFreed} bytes`);
 * ```
 */
export async function clearAllCaches(): Promise<number> {
  let bytesFreed = 0;

  // Get initial usage
  const initialInfo = await getStorageInfo();
  const initialUsage = initialInfo.usage;

  // Clear Cache API
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  } catch (error) {
    console.error('Failed to clear Cache API:', error);
  }

  // Clear IndexedDB (our app databases)
  try {
    await clearIndexedDB();
  } catch (error) {
    console.error('Failed to clear IndexedDB:', error);
  }

  // Calculate bytes freed
  const finalInfo = await getStorageInfo();
  bytesFreed = Math.max(0, initialUsage - finalInfo.usage);

  return bytesFreed;
}

/**
 * Clear specific cache by name.
 *
 * @param cacheName Name of the cache to clear
 * @returns Promise that resolves to true if cache was deleted
 */
export async function clearCache(cacheName: string): Promise<boolean> {
  if (!('caches' in window)) {
    return false;
  }

  try {
    return await caches.delete(cacheName);
  } catch (error) {
    console.error(`Failed to clear cache "${cacheName}":`, error);
    return false;
  }
}

/**
 * Get list of all cache names.
 *
 * @returns Promise with array of cache names
 */
export async function getCacheNames(): Promise<string[]> {
  if (!('caches' in window)) {
    return [];
  }

  try {
    return await caches.keys();
  } catch (error) {
    console.error('Failed to get cache names:', error);
    return [];
  }
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Extended StorageEstimate interface with Chrome-specific usageDetails
 */
interface StorageEstimateWithDetails extends StorageEstimate {
  usageDetails?: {
    indexedDB?: number;
    caches?: number;
    serviceWorkerRegistrations?: number;
  };
}

/**
 * Extract storage breakdown from Chrome's usageDetails
 */
function extractBreakdown(
  estimate: StorageEstimateWithDetails
): StorageBreakdown | null {
  if (!estimate.usageDetails) {
    return null;
  }

  const details = estimate.usageDetails;
  const totalKnown =
    (details.indexedDB || 0) +
    (details.caches || 0) +
    (details.serviceWorkerRegistrations || 0);

  const totalUsage = estimate.usage || 0;

  return {
    indexedDB: details.indexedDB || 0,
    cacheStorage: details.caches || 0,
    serviceWorker: details.serviceWorkerRegistrations || 0,
    other: Math.max(0, totalUsage - totalKnown),
  };
}

/**
 * Clear IndexedDB databases owned by our app.
 */
async function clearIndexedDB(): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    return;
  }

  // Known database names for Travel Life
  const knownDatabases = [
    'travel-life-offline',
    'travel-life-cache',
    'workbox-expiration',
  ];

  // Try to get all database names (Chrome/Firefox)
  let databaseNames: string[] = knownDatabases;

  try {
    if ('databases' in indexedDB && typeof indexedDB.databases === 'function') {
      const databases = await indexedDB.databases();
      databaseNames = databases
        .map((db) => db.name)
        .filter((name): name is string => !!name);
    }
  } catch {
    // Use known databases as fallback
  }

  // Delete each database
  await Promise.all(
    databaseNames.map(
      (name) =>
        new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = () => resolve();
          request.onerror = () => {
            console.error(`Failed to delete database "${name}"`);
            resolve(); // Continue even if one fails
          };
          // Timeout after 5 seconds
          setTimeout(resolve, 5000);
        })
    )
  );
}

/**
 * Format bytes to human-readable string.
 *
 * @param bytes Number of bytes
 * @returns Formatted string (e.g., "25.3 MB")
 */
export function formatStorageSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  if (i >= 2) {
    return `${size.toFixed(1)} ${sizes[i]}`;
  }
  return `${Math.round(size)} ${sizes[i]}`;
}
