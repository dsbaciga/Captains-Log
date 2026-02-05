/**
 * Tests for Offline Database Layer
 *
 * These tests verify the IndexedDB setup, store creation, and basic CRUD operations.
 * Uses fake-indexeddb for testing in Node.js environment.
 *
 * Note: To run these tests, you need to install fake-indexeddb:
 *   npm install --save-dev fake-indexeddb
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';

// Import fake-indexeddb before any IDB usage
// This must be done at the top of the test file
import 'fake-indexeddb/auto';

import {
  getDb,
  closeDb,
  deleteDb,
  isIndexedDBSupported,
  getStoreCount,
  getAllStoreCounts,
  clearStore,
  clearAllStores,
  verifyStores,
  STORE_NAMES,
  DB_NAME,
  DB_VERSION,
  type TravelLifeDB,
} from './offlineDb';
import type { IDBPDatabase } from 'idb';
import type {
  TripStoreValue,
  LocationStoreValue,
  SyncOperation,
  IdMapping,
} from '../types/offline.types';
import type { Trip } from '../types/trip';
import type { Location } from '../types/location';

describe('Offline Database (IndexedDB)', () => {
  // Clean up database before each test
  beforeEach(async () => {
    closeDb();
    await deleteDb();
  });

  // Clean up after all tests
  afterAll(async () => {
    closeDb();
    await deleteDb();
  });

  // ============================================
  // DATABASE SETUP TESTS
  // ============================================

  describe('Database Setup', () => {
    it('should detect IndexedDB support', () => {
      expect(isIndexedDBSupported()).toBe(true);
    });

    it('should open the database successfully', async () => {
      const db = await getDb();
      expect(db).toBeDefined();
      expect(db.name).toBe(DB_NAME);
      expect(db.version).toBe(DB_VERSION);
    });

    it('should return the same instance on multiple calls', async () => {
      const db1 = await getDb();
      const db2 = await getDb();
      expect(db1).toBe(db2);
    });

    it('should create a new instance after closeDb()', async () => {
      const db1 = await getDb();
      closeDb();
      const db2 = await getDb();
      // Different instances but same database
      expect(db2).toBeDefined();
      expect(db2.name).toBe(DB_NAME);
    });
  });

  // ============================================
  // STORE CREATION TESTS
  // ============================================

  describe('Store Creation', () => {
    it('should create all expected object stores', async () => {
      const db = await getDb();
      const storeNames = Array.from(db.objectStoreNames);

      // Verify all expected stores exist
      for (const expectedStore of STORE_NAMES) {
        expect(storeNames).toContain(expectedStore);
      }
    });

    it('should create exactly 28 stores', async () => {
      const db = await getDb();
      expect(db.objectStoreNames.length).toBe(28);
    });

    it('should pass store verification', async () => {
      const result = await verifyStores();
      expect(result.valid).toBe(true);
      expect(result.storeCount).toBe(28);
      expect(result.missingStores).toHaveLength(0);
    });

    it('should create trips store with correct indexes', async () => {
      const db = await getDb();
      const tx = db.transaction('trips', 'readonly');
      const store = tx.objectStore('trips');

      expect(store.indexNames).toContain('by-status');
      expect(store.indexNames).toContain('by-date');
      expect(store.indexNames).toContain('by-downloaded');
    });

    it('should create locations store with correct indexes', async () => {
      const db = await getDb();
      const tx = db.transaction('locations', 'readonly');
      const store = tx.objectStore('locations');

      expect(store.indexNames).toContain('by-trip');
      expect(store.indexNames).toContain('by-local-id');
    });

    it('should create syncQueue store with auto-increment', async () => {
      const db = await getDb();

      // Add without specifying id - should auto-increment
      const id = await db.add('syncQueue', {
        operation: 'create',
        entityType: 'trip',
        entityId: '1',
        tripId: '1',
        data: {},
        timestamp: Date.now(),
        retryCount: 0,
      } as SyncOperation);

      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
    });
  });

  // ============================================
  // BASIC CRUD OPERATIONS TESTS
  // ============================================

  describe('Basic CRUD Operations', () => {
    describe('Trips Store', () => {
      const mockTrip: Trip = {
        id: 1,
        userId: 1,
        title: 'Test Trip',
        description: 'A test trip',
        startDate: '2024-06-01',
        endDate: '2024-06-07',
        timezone: 'America/New_York',
        status: 'Planned',
        privacyLevel: 'Private',
        addToPlacesVisited: true,
        coverPhotoId: null,
        bannerPhotoId: null,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      };

      it('should add and retrieve a trip', async () => {
        const db = await getDb();

        const tripRecord: TripStoreValue = {
          id: '1',
          data: mockTrip,
          lastSync: Date.now(),
          version: 1,
          downloadedForOffline: false,
        };

        await db.put('trips', tripRecord);
        const retrieved = await db.get('trips', '1');

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe('1');
        expect(retrieved?.data.title).toBe('Test Trip');
      });

      it('should update a trip', async () => {
        const db = await getDb();

        const tripRecord: TripStoreValue = {
          id: '1',
          data: mockTrip,
          lastSync: Date.now(),
          version: 1,
          downloadedForOffline: false,
        };

        await db.put('trips', tripRecord);

        // Update the trip
        const updatedRecord: TripStoreValue = {
          ...tripRecord,
          data: { ...mockTrip, title: 'Updated Trip' },
          version: 2,
        };
        await db.put('trips', updatedRecord);

        const retrieved = await db.get('trips', '1');
        expect(retrieved?.data.title).toBe('Updated Trip');
        expect(retrieved?.version).toBe(2);
      });

      it('should delete a trip', async () => {
        const db = await getDb();

        const tripRecord: TripStoreValue = {
          id: '1',
          data: mockTrip,
          lastSync: Date.now(),
          version: 1,
          downloadedForOffline: false,
        };

        await db.put('trips', tripRecord);
        await db.delete('trips', '1');

        const retrieved = await db.get('trips', '1');
        expect(retrieved).toBeUndefined();
      });

      it('should query trips by status index', async () => {
        const db = await getDb();

        // Add multiple trips with different statuses
        await db.put('trips', {
          id: '1',
          data: { ...mockTrip, id: 1, status: 'Planned' },
          lastSync: Date.now(),
          version: 1,
          downloadedForOffline: false,
        });
        await db.put('trips', {
          id: '2',
          data: { ...mockTrip, id: 2, status: 'In Progress' },
          lastSync: Date.now(),
          version: 1,
          downloadedForOffline: false,
        });
        await db.put('trips', {
          id: '3',
          data: { ...mockTrip, id: 3, status: 'Planned' },
          lastSync: Date.now(),
          version: 1,
          downloadedForOffline: false,
        });

        const plannedTrips = await db.getAllFromIndex('trips', 'by-status', 'Planned');
        expect(plannedTrips).toHaveLength(2);
      });
    });

    describe('Locations Store', () => {
      const mockLocation: Location = {
        id: 1,
        tripId: 1,
        parentId: null,
        name: 'Test Location',
        address: '123 Test St',
        latitude: 40.7128,
        longitude: -74.006,
        categoryId: 1,
        visitDatetime: '2024-06-02T10:00:00Z',
        visitDurationMinutes: 120,
        notes: 'Test notes',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      };

      it('should add and retrieve a location', async () => {
        const db = await getDb();

        const locationRecord: LocationStoreValue = {
          id: '1',
          tripId: '1',
          data: mockLocation,
          lastSync: Date.now(),
        };

        await db.put('locations', locationRecord);
        const retrieved = await db.get('locations', '1');

        expect(retrieved).toBeDefined();
        expect(retrieved?.data.name).toBe('Test Location');
      });

      it('should query locations by trip index', async () => {
        const db = await getDb();

        // Add locations for different trips
        await db.put('locations', {
          id: '1',
          tripId: '1',
          data: { ...mockLocation, id: 1 },
          lastSync: Date.now(),
        });
        await db.put('locations', {
          id: '2',
          tripId: '1',
          data: { ...mockLocation, id: 2 },
          lastSync: Date.now(),
        });
        await db.put('locations', {
          id: '3',
          tripId: '2',
          data: { ...mockLocation, id: 3 },
          lastSync: Date.now(),
        });

        const trip1Locations = await db.getAllFromIndex('locations', 'by-trip', '1');
        expect(trip1Locations).toHaveLength(2);

        const trip2Locations = await db.getAllFromIndex('locations', 'by-trip', '2');
        expect(trip2Locations).toHaveLength(1);
      });
    });

    describe('Sync Queue Store', () => {
      it('should add sync operations with auto-increment', async () => {
        const db = await getDb();

        const op1: Omit<SyncOperation, 'id'> = {
          operation: 'create',
          entityType: 'location',
          entityId: 'local-123',
          localId: 'local-123',
          tripId: '1',
          data: { name: 'New Location' },
          timestamp: Date.now(),
          retryCount: 0,
        };

        const op2: Omit<SyncOperation, 'id'> = {
          operation: 'update',
          entityType: 'trip',
          entityId: '1',
          tripId: '1',
          data: { title: 'Updated Title' },
          timestamp: Date.now(),
          retryCount: 0,
        };

        const id1 = await db.add('syncQueue', op1 as SyncOperation);
        const id2 = await db.add('syncQueue', op2 as SyncOperation);

        expect(id2).toBeGreaterThan(id1);

        const allOps = await db.getAll('syncQueue');
        expect(allOps).toHaveLength(2);
      });

      it('should query sync operations by entity type', async () => {
        const db = await getDb();

        await db.add('syncQueue', {
          operation: 'create',
          entityType: 'location',
          entityId: '1',
          tripId: '1',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
        } as SyncOperation);

        await db.add('syncQueue', {
          operation: 'update',
          entityType: 'trip',
          entityId: '1',
          tripId: '1',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
        } as SyncOperation);

        const locationOps = await db.getAllFromIndex('syncQueue', 'by-entity-type', 'location');
        expect(locationOps).toHaveLength(1);
        expect(locationOps[0].entityType).toBe('location');
      });
    });

    describe('ID Mappings Store', () => {
      it('should store and retrieve ID mappings', async () => {
        const db = await getDb();

        const mapping: IdMapping = {
          localId: 'local-uuid-123',
          serverId: '456',
          entityType: 'location',
          createdAt: Date.now(),
        };

        await db.put('idMappings', mapping);

        // Retrieve by local ID (primary key)
        const byLocal = await db.get('idMappings', 'local-uuid-123');
        expect(byLocal?.serverId).toBe('456');

        // Retrieve by server ID (index)
        const byServer = await db.getFromIndex('idMappings', 'by-server-id', '456');
        expect(byServer?.localId).toBe('local-uuid-123');
      });

      it('should query mappings by entity type', async () => {
        const db = await getDb();

        await db.put('idMappings', {
          localId: 'local-1',
          serverId: '1',
          entityType: 'location',
          createdAt: Date.now(),
        });
        await db.put('idMappings', {
          localId: 'local-2',
          serverId: '2',
          entityType: 'activity',
          createdAt: Date.now(),
        });
        await db.put('idMappings', {
          localId: 'local-3',
          serverId: '3',
          entityType: 'location',
          createdAt: Date.now(),
        });

        const locationMappings = await db.getAllFromIndex('idMappings', 'by-type', 'location');
        expect(locationMappings).toHaveLength(2);
      });
    });

    describe('Metadata Store', () => {
      it('should store and retrieve metadata', async () => {
        const db = await getDb();

        await db.put('metadata', {
          key: 'lastSyncTime',
          value: Date.now(),
        });
        await db.put('metadata', {
          key: 'userPreferences',
          value: { theme: 'dark', notifications: true },
        });

        const lastSync = await db.get('metadata', 'lastSyncTime');
        expect(lastSync?.value).toBeDefined();

        const prefs = await db.get('metadata', 'userPreferences');
        expect(prefs?.value).toEqual({ theme: 'dark', notifications: true });
      });
    });
  });

  // ============================================
  // UTILITY FUNCTION TESTS
  // ============================================

  describe('Utility Functions', () => {
    it('should count records in a store', async () => {
      const db = await getDb();

      // Add some trips
      await db.put('trips', {
        id: '1',
        data: {} as Trip,
        lastSync: Date.now(),
        version: 1,
        downloadedForOffline: false,
      });
      await db.put('trips', {
        id: '2',
        data: {} as Trip,
        lastSync: Date.now(),
        version: 1,
        downloadedForOffline: false,
      });

      const count = await getStoreCount('trips');
      expect(count).toBe(2);
    });

    it('should get counts for all stores', async () => {
      const db = await getDb();

      // Add some data
      await db.put('trips', {
        id: '1',
        data: {} as Trip,
        lastSync: Date.now(),
        version: 1,
        downloadedForOffline: false,
      });
      await db.put('locations', {
        id: '1',
        tripId: '1',
        data: {} as Location,
        lastSync: Date.now(),
      });

      const counts = await getAllStoreCounts();
      expect(counts.trips).toBe(1);
      expect(counts.locations).toBe(1);
      expect(counts.activities).toBe(0);
    });

    it('should clear a specific store', async () => {
      const db = await getDb();

      await db.put('trips', {
        id: '1',
        data: {} as Trip,
        lastSync: Date.now(),
        version: 1,
        downloadedForOffline: false,
      });
      await db.put('locations', {
        id: '1',
        tripId: '1',
        data: {} as Location,
        lastSync: Date.now(),
      });

      await clearStore('trips');

      const tripCount = await db.count('trips');
      const locationCount = await db.count('locations');

      expect(tripCount).toBe(0);
      expect(locationCount).toBe(1); // Locations should be unaffected
    });

    it('should clear all stores', async () => {
      const db = await getDb();

      await db.put('trips', {
        id: '1',
        data: {} as Trip,
        lastSync: Date.now(),
        version: 1,
        downloadedForOffline: false,
      });
      await db.put('locations', {
        id: '1',
        tripId: '1',
        data: {} as Location,
        lastSync: Date.now(),
      });

      await clearAllStores();

      const tripCount = await db.count('trips');
      const locationCount = await db.count('locations');

      expect(tripCount).toBe(0);
      expect(locationCount).toBe(0);
    });
  });

  // ============================================
  // TRANSACTION TESTS
  // ============================================

  describe('Transactions', () => {
    it('should support multi-store transactions', async () => {
      const db = await getDb();

      // Start a transaction across multiple stores
      const tx = db.transaction(['trips', 'locations', 'activities'], 'readwrite');

      await tx.objectStore('trips').put({
        id: '1',
        data: {} as Trip,
        lastSync: Date.now(),
        version: 1,
        downloadedForOffline: false,
      });

      await tx.objectStore('locations').put({
        id: '1',
        tripId: '1',
        data: {} as Location,
        lastSync: Date.now(),
      });

      await tx.done;

      // Verify data was written
      const trip = await db.get('trips', '1');
      const location = await db.get('locations', '1');

      expect(trip).toBeDefined();
      expect(location).toBeDefined();
    });

    it('should batch operations in a transaction', async () => {
      const db = await getDb();

      const tx = db.transaction('locations', 'readwrite');
      const store = tx.objectStore('locations');

      // Batch add multiple locations
      const promises = [];
      for (let i = 1; i <= 10; i++) {
        promises.push(
          store.put({
            id: String(i),
            tripId: '1',
            data: { name: `Location ${i}` } as Location,
            lastSync: Date.now(),
          })
        );
      }

      await Promise.all(promises);
      await tx.done;

      const count = await db.count('locations');
      expect(count).toBe(10);
    });
  });

  // ============================================
  // DATABASE DELETION TESTS
  // ============================================

  describe('Database Deletion', () => {
    it('should delete the database', async () => {
      // First create and populate database
      const db = await getDb();
      await db.put('trips', {
        id: '1',
        data: {} as Trip,
        lastSync: Date.now(),
        version: 1,
        downloadedForOffline: false,
      });

      // Delete the database
      await deleteDb();

      // Re-open and verify it's empty
      const newDb = await getDb();
      const count = await newDb.count('trips');
      expect(count).toBe(0);
    });
  });
});
