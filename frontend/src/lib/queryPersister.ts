/**
 * IndexedDB-based persister for TanStack Query
 *
 * Enables query cache persistence across browser sessions using IndexedDB.
 * This is essential for PWA offline support, allowing cached data to survive
 * page refreshes and browser restarts.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

// Database configuration
const DB_NAME = 'travel-life-cache';
const DB_VERSION = 1;
const STORE_NAME = 'metadata';
const QUERY_CLIENT_KEY = 'queryClient';

// Type for our database schema
interface CacheDB {
  metadata: {
    key: string;
    value: PersistedClient;
  };
}

// Singleton database instance
let dbInstance: IDBPDatabase<CacheDB> | null = null;
let dbInitPromise: Promise<IDBPDatabase<CacheDB>> | null = null;

/**
 * Get or create the IndexedDB database instance
 * Uses singleton pattern to avoid multiple connections
 */
async function getDb(): Promise<IDBPDatabase<CacheDB>> {
  // Return existing instance if available
  if (dbInstance) {
    return dbInstance;
  }

  // If initialization is in progress, wait for it
  if (dbInitPromise) {
    return dbInitPromise;
  }

  // Start initialization
  dbInitPromise = openDB<CacheDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create the metadata store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
    blocked() {
      console.warn('[QueryPersister] Database blocked by older version');
    },
    blocking() {
      // Close our connection when a newer version tries to open
      dbInstance?.close();
      dbInstance = null;
    },
    terminated() {
      console.warn('[QueryPersister] Database connection terminated unexpectedly');
      dbInstance = null;
      dbInitPromise = null;
    },
  });

  try {
    dbInstance = await dbInitPromise;
    return dbInstance;
  } catch (error) {
    dbInitPromise = null;
    throw error;
  }
}

/**
 * Check if IndexedDB is available in the current environment
 */
function isIndexedDBAvailable(): boolean {
  try {
    // Check if indexedDB exists and is accessible
    if (typeof indexedDB === 'undefined') {
      return false;
    }
    // Try to access it (some browsers block in private mode)
    return !!indexedDB;
  } catch {
    return false;
  }
}

/**
 * Create an IndexedDB-based persister for TanStack Query
 *
 * This persister stores the entire query cache in IndexedDB,
 * allowing it to survive browser restarts and page refreshes.
 *
 * @returns A Persister compatible with @tanstack/react-query-persist-client
 */
export function createIDBPersister(): Persister {
  return {
    /**
     * Save the query client state to IndexedDB
     */
    persistClient: async (client: PersistedClient): Promise<void> => {
      if (!isIndexedDBAvailable()) {
        console.warn('[QueryPersister] IndexedDB not available, skipping persist');
        return;
      }

      try {
        const db = await getDb();
        await db.put(STORE_NAME, client, QUERY_CLIENT_KEY);
      } catch (error) {
        // Log but don't throw - persistence failure shouldn't break the app
        console.error('[QueryPersister] Failed to persist query client:', error);
      }
    },

    /**
     * Restore the query client state from IndexedDB
     */
    restoreClient: async (): Promise<PersistedClient | undefined> => {
      if (!isIndexedDBAvailable()) {
        console.warn('[QueryPersister] IndexedDB not available, skipping restore');
        return undefined;
      }

      try {
        const db = await getDb();
        const client = await db.get(STORE_NAME, QUERY_CLIENT_KEY);

        if (client) {
          console.log('[QueryPersister] Restored query client from IndexedDB');
        }

        return client;
      } catch (error) {
        // Log but return undefined - restore failure shouldn't break the app
        console.error('[QueryPersister] Failed to restore query client:', error);
        return undefined;
      }
    },

    /**
     * Remove the persisted query client from IndexedDB
     */
    removeClient: async (): Promise<void> => {
      if (!isIndexedDBAvailable()) {
        return;
      }

      try {
        const db = await getDb();
        await db.delete(STORE_NAME, QUERY_CLIENT_KEY);
        console.log('[QueryPersister] Removed persisted query client');
      } catch (error) {
        console.error('[QueryPersister] Failed to remove query client:', error);
      }
    },
  };
}

/**
 * Clear all cached data from IndexedDB
 * Useful for logout or cache invalidation scenarios
 */
export async function clearPersistedCache(): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return;
  }

  try {
    const db = await getDb();
    await db.clear(STORE_NAME);
    console.log('[QueryPersister] Cleared all persisted cache');
  } catch (error) {
    console.error('[QueryPersister] Failed to clear cache:', error);
  }
}

/**
 * Get the size of the persisted cache (for debugging)
 */
export async function getPersistedCacheSize(): Promise<number> {
  if (!isIndexedDBAvailable()) {
    return 0;
  }

  try {
    const db = await getDb();
    const count = await db.count(STORE_NAME);
    return count;
  } catch (error) {
    console.error('[QueryPersister] Failed to get cache size:', error);
    return 0;
  }
}
