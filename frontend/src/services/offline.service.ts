/**
 * Offline Service
 *
 * Handles offline data caching and sync queue management for the PWA.
 * Stores trip data in IndexedDB for offline access and queues changes
 * made while offline for synchronization when connectivity returns.
 *
 * IMPORTANT: All IDs are stored as strings in IndexedDB. Use String(id) when storing
 * and parseInt(id, 10) when making API calls.
 */

import { getDb } from '../lib/offlineDb';
import type { Trip } from '../types/trip';
import type { Location } from '../types/location';
import type { Activity } from '../types/activity';
import type { Transportation } from '../types/transportation';
import type { Lodging } from '../types/lodging';
import type { JournalEntry } from '../types/journalEntry';
import type { Photo, PhotoAlbum } from '../types/photo';
import type {
  SyncOperation,
  SyncOperationType,
  SyncEntityType,
} from '../types/offline.types';

// Re-export types for convenience
export type { SyncOperation, SyncOperationType, SyncEntityType };

/**
 * Represents all entities associated with a trip
 */
export interface TripEntities {
  locations: Location[];
  activities: Activity[];
  transportation: Transportation[];
  lodging: Lodging[];
  journals: JournalEntry[];
  photos?: Photo[];
  albums?: PhotoAlbum[];
}

class OfflineService {
  /**
   * Cache a trip after successful API fetch
   * @param trip The trip data to cache
   */
  async cacheTrip(trip: Trip): Promise<void> {
    const db = await getDb();
    const tripId = String(trip.id);

    // Check if trip already exists to preserve downloadedForOffline flag
    const existing = await db.get('trips', tripId);

    await db.put('trips', {
      id: tripId,
      data: trip,
      lastSync: Date.now(),
      version: existing?.version ? existing.version + 1 : 1,
      downloadedForOffline: existing?.downloadedForOffline ?? false,
    });
  }

  /**
   * Get cached trip data (offline fallback)
   * @param tripId The trip ID to retrieve
   * @returns The cached trip or null if not found
   */
  async getCachedTrip(tripId: number | string): Promise<Trip | null> {
    const db = await getDb();
    const record = await db.get('trips', String(tripId));
    return record?.data ?? null;
  }

  /**
   * Get all cached trips
   * @returns Array of cached trips
   */
  async getAllCachedTrips(): Promise<Trip[]> {
    const db = await getDb();
    const records = await db.getAll('trips');
    return records.map(r => r.data);
  }

  /**
   * Get trips marked for offline access
   * @returns Array of trips explicitly downloaded for offline use
   */
  async getOfflineTrips(): Promise<Trip[]> {
    const db = await getDb();
    // Get all trips and filter for downloaded ones
    // (IndexedDB boolean indexes have type compatibility issues with idb library)
    const allRecords = await db.getAll('trips');
    return allRecords.filter(r => r.downloadedForOffline).map(r => r.data);
  }

  /**
   * Mark a trip as downloaded for offline use
   * @param tripId The trip ID to mark
   */
  async markTripForOffline(tripId: number | string): Promise<void> {
    const db = await getDb();
    const id = String(tripId);
    const existing = await db.get('trips', id);

    if (existing) {
      await db.put('trips', {
        ...existing,
        downloadedForOffline: true,
      });
    }
  }

  /**
   * Remove offline marking from a trip
   * @param tripId The trip ID to unmark
   */
  async unmarkTripForOffline(tripId: number | string): Promise<void> {
    const db = await getDb();
    const id = String(tripId);
    const existing = await db.get('trips', id);

    if (existing) {
      await db.put('trips', {
        ...existing,
        downloadedForOffline: false,
      });
    }
  }

  /**
   * Cache all entities for a trip
   * @param tripId The trip ID
   * @param entities All entities to cache
   */
  async cacheTripEntities(tripId: number | string, entities: TripEntities): Promise<void> {
    const db = await getDb();
    const tripIdStr = String(tripId);
    const now = Date.now();

    // Use a transaction to ensure atomicity
    const tx = db.transaction(
      ['locations', 'activities', 'transportation', 'lodging', 'journals', 'photos', 'photoAlbums'],
      'readwrite'
    );

    // Cache locations
    for (const location of entities.locations) {
      await tx.objectStore('locations').put({
        id: String(location.id),
        tripId: tripIdStr,
        data: location,
        lastSync: now,
      });
    }

    // Cache activities
    for (const activity of entities.activities) {
      await tx.objectStore('activities').put({
        id: String(activity.id),
        tripId: tripIdStr,
        data: activity,
        lastSync: now,
      });
    }

    // Cache transportation
    for (const transport of entities.transportation) {
      await tx.objectStore('transportation').put({
        id: String(transport.id),
        tripId: tripIdStr,
        data: transport,
        lastSync: now,
      });
    }

    // Cache lodging
    for (const lodge of entities.lodging) {
      await tx.objectStore('lodging').put({
        id: String(lodge.id),
        tripId: tripIdStr,
        data: lodge,
        lastSync: now,
      });
    }

    // Cache journal entries
    for (const journal of entities.journals) {
      await tx.objectStore('journals').put({
        id: String(journal.id),
        tripId: tripIdStr,
        data: journal,
        lastSync: now,
      });
    }

    // Cache photos if provided
    if (entities.photos) {
      for (const photo of entities.photos) {
        await tx.objectStore('photos').put({
          id: String(photo.id),
          tripId: tripIdStr,
          metadata: photo,
          thumbnailCached: false,
          fullCached: false,
          lastSync: now,
        });
      }
    }

    // Cache albums if provided
    if (entities.albums) {
      for (const album of entities.albums) {
        await tx.objectStore('photoAlbums').put({
          id: String(album.id),
          tripId: tripIdStr,
          data: album,
          lastSync: now,
        });
      }
    }

    await tx.done;
  }

  /**
   * Get all cached data for a trip (offline mode)
   * @param tripId The trip ID
   * @returns All cached entities for the trip or null if not found
   */
  async getCachedTripData(tripId: number | string): Promise<TripEntities | null> {
    const db = await getDb();
    const tripIdStr = String(tripId);

    try {
      const [locations, activities, transportation, lodging, journals, photos, albums] = await Promise.all([
        db.getAllFromIndex('locations', 'by-trip', tripIdStr),
        db.getAllFromIndex('activities', 'by-trip', tripIdStr),
        db.getAllFromIndex('transportation', 'by-trip', tripIdStr),
        db.getAllFromIndex('lodging', 'by-trip', tripIdStr),
        db.getAllFromIndex('journals', 'by-trip', tripIdStr),
        db.getAllFromIndex('photos', 'by-trip', tripIdStr),
        db.getAllFromIndex('photoAlbums', 'by-trip', tripIdStr),
      ]);

      return {
        locations: locations.map(r => r.data),
        activities: activities.map(r => r.data),
        transportation: transportation.map(r => r.data),
        lodging: lodging.map(r => r.data),
        journals: journals.map(r => r.data),
        photos: photos.map(r => r.metadata),
        albums: albums.map(r => r.data),
      };
    } catch (error) {
      console.error('Error getting cached trip data:', error);
      return null;
    }
  }

  /**
   * Cache a single location
   * @param tripId The trip ID
   * @param location The location to cache
   */
  async cacheLocation(tripId: number | string, location: Location): Promise<void> {
    const db = await getDb();
    await db.put('locations', {
      id: String(location.id),
      tripId: String(tripId),
      data: location,
      lastSync: Date.now(),
    });
  }

  /**
   * Cache a single activity
   * @param tripId The trip ID
   * @param activity The activity to cache
   */
  async cacheActivity(tripId: number | string, activity: Activity): Promise<void> {
    const db = await getDb();
    await db.put('activities', {
      id: String(activity.id),
      tripId: String(tripId),
      data: activity,
      lastSync: Date.now(),
    });
  }

  /**
   * Cache a single transportation
   * @param tripId The trip ID
   * @param transportation The transportation to cache
   */
  async cacheTransportation(tripId: number | string, transportation: Transportation): Promise<void> {
    const db = await getDb();
    await db.put('transportation', {
      id: String(transportation.id),
      tripId: String(tripId),
      data: transportation,
      lastSync: Date.now(),
    });
  }

  /**
   * Cache a single lodging
   * @param tripId The trip ID
   * @param lodging The lodging to cache
   */
  async cacheLodging(tripId: number | string, lodging: Lodging): Promise<void> {
    const db = await getDb();
    await db.put('lodging', {
      id: String(lodging.id),
      tripId: String(tripId),
      data: lodging,
      lastSync: Date.now(),
    });
  }

  /**
   * Cache a single journal entry
   * @param tripId The trip ID
   * @param journal The journal entry to cache
   */
  async cacheJournal(tripId: number | string, journal: JournalEntry): Promise<void> {
    const db = await getDb();
    await db.put('journals', {
      id: String(journal.id),
      tripId: String(tripId),
      data: journal,
      lastSync: Date.now(),
    });
  }

  /**
   * Cache a single photo metadata
   * @param tripId The trip ID
   * @param photo The photo to cache
   */
  async cachePhoto(tripId: number | string, photo: Photo): Promise<void> {
    const db = await getDb();
    const existing = await db.get('photos', String(photo.id));

    await db.put('photos', {
      id: String(photo.id),
      tripId: String(tripId),
      metadata: photo,
      thumbnailCached: existing?.thumbnailCached ?? false,
      fullCached: existing?.fullCached ?? false,
      lastSync: Date.now(),
    });
  }

  /**
   * Update photo cache status
   * @param photoId The photo ID
   * @param thumbnailCached Whether the thumbnail is cached
   * @param fullCached Whether the full image is cached
   */
  async updatePhotoCacheStatus(
    photoId: number | string,
    thumbnailCached?: boolean,
    fullCached?: boolean
  ): Promise<void> {
    const db = await getDb();
    const id = String(photoId);
    const existing = await db.get('photos', id);

    if (existing) {
      await db.put('photos', {
        ...existing,
        thumbnailCached: thumbnailCached ?? existing.thumbnailCached,
        fullCached: fullCached ?? existing.fullCached,
        lastSync: Date.now(),
      });
    }
  }

  /**
   * Add to sync queue (offline changes)
   * @param operation The sync operation to queue
   */
  async queueChange(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<number> {
    const db = await getDb();
    const id = await db.add('syncQueue', {
      ...operation,
      timestamp: Date.now(),
      retryCount: 0,
    });
    return id;
  }

  /**
   * Get pending sync operations
   * @returns Array of pending sync operations
   */
  async getPendingChanges(): Promise<SyncOperation[]> {
    const db = await getDb();
    return db.getAll('syncQueue');
  }

  /**
   * Get pending changes for a specific trip
   * @param tripId The trip ID
   * @returns Array of pending sync operations for the trip
   */
  async getPendingChangesForTrip(tripId: number | string): Promise<SyncOperation[]> {
    const db = await getDb();
    const allChanges = await db.getAll('syncQueue');
    return allChanges.filter(change => change.tripId === String(tripId));
  }

  /**
   * Get count of pending sync operations
   * @returns Number of pending operations
   */
  async getPendingChangeCount(): Promise<number> {
    const db = await getDb();
    const changes = await db.getAll('syncQueue');
    return changes.length;
  }

  /**
   * Remove synced operation from queue
   * @param id The operation ID to remove
   */
  async removeSyncedChange(id: number): Promise<void> {
    const db = await getDb();
    await db.delete('syncQueue', id);
  }

  /**
   * Update a sync operation (e.g., to increment retry count)
   * @param id The operation ID
   * @param updates The updates to apply
   */
  async updateSyncOperation(id: number, updates: Partial<SyncOperation>): Promise<void> {
    const db = await getDb();
    const existing = await db.get('syncQueue', id);

    if (existing) {
      await db.put('syncQueue', {
        ...existing,
        ...updates,
        id, // Preserve the ID
      });
    }
  }

  /**
   * Increment retry count for a sync operation
   * @param id The operation ID
   * @returns The new retry count
   */
  async incrementRetryCount(id: number): Promise<number> {
    const db = await getDb();
    const existing = await db.get('syncQueue', id);

    if (existing) {
      const newCount = (existing.retryCount || 0) + 1;
      await db.put('syncQueue', {
        ...existing,
        retryCount: newCount,
      });
      return newCount;
    }
    return 0;
  }

  /**
   * Get the last sync time for a trip
   * @param tripId The trip ID
   * @returns The last sync timestamp or null if never synced
   */
  async getLastSyncTime(tripId: number | string): Promise<number | null> {
    const db = await getDb();
    const trip = await db.get('trips', String(tripId));
    return trip?.lastSync ?? null;
  }

  /**
   * Update the last sync time for a trip
   * @param tripId The trip ID
   */
  async updateLastSyncTime(tripId: number | string): Promise<void> {
    const db = await getDb();
    const id = String(tripId);
    const existing = await db.get('trips', id);

    if (existing) {
      await db.put('trips', {
        ...existing,
        lastSync: Date.now(),
      });
    }
  }

  /**
   * Delete all cached data for a trip
   * @param tripId The trip ID
   */
  async clearTripCache(tripId: number | string): Promise<void> {
    const db = await getDb();
    const tripIdStr = String(tripId);

    // Delete trip
    await db.delete('trips', tripIdStr);

    // Delete all related entities
    const stores = ['locations', 'activities', 'transportation', 'lodging', 'journals', 'photos', 'photoAlbums'] as const;

    for (const store of stores) {
      const items = await db.getAllFromIndex(store, 'by-trip', tripIdStr);
      for (const item of items) {
        await db.delete(store, item.id);
      }
    }
  }

  /**
   * Clear all cached data
   */
  async clearAllCache(): Promise<void> {
    const db = await getDb();

    const stores = [
      'trips', 'locations', 'activities', 'transportation',
      'lodging', 'journals', 'photos', 'photoAlbums'
    ] as const;

    for (const store of stores) {
      await db.clear(store);
    }
  }

  /**
   * Clear the entire sync queue
   */
  async clearSyncQueue(): Promise<void> {
    const db = await getDb();
    await db.clear('syncQueue');
  }

  /**
   * Get storage usage estimates
   * @returns Estimated storage usage
   */
  async getStorageEstimate(): Promise<{ used: number; available: number; quota: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0),
        quota: estimate.quota || 0,
      };
    }
    return { used: 0, available: 0, quota: 0 };
  }

  /**
   * Check if a trip is cached
   * @param tripId The trip ID
   * @returns True if the trip is cached
   */
  async isTripCached(tripId: number | string): Promise<boolean> {
    const db = await getDb();
    const trip = await db.get('trips', String(tripId));
    return trip !== undefined;
  }

  /**
   * Check if a trip is downloaded for offline use
   * @param tripId The trip ID
   * @returns True if the trip is marked for offline use
   */
  async isTripDownloadedForOffline(tripId: number | string): Promise<boolean> {
    const db = await getDb();
    const trip = await db.get('trips', String(tripId));
    return trip?.downloadedForOffline ?? false;
  }
}

// Export singleton instance
export const offlineService = new OfflineService();
export default offlineService;
