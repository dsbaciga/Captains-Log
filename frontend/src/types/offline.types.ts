/**
 * Offline Database Types for Travel Life PWA
 *
 * These types define the structures used for offline data storage in IndexedDB.
 * All IDs are stored as strings in IndexedDB (the backend uses integers).
 */

import type { Trip } from './trip';
import type { Location, LocationCategory } from './location';
import type { Activity } from './activity';
import type { Transportation, FlightTracking } from './transportation';
import type { Lodging } from './lodging';
import type { JournalEntry } from './journalEntry';
import type { Photo, PhotoAlbum } from './photo';
import type { EntityLink } from './entityLink';
import type { Tag } from './tag';
import type { Companion } from './companion';
import type { Checklist, ChecklistItem } from './checklist';
import type { WeatherData } from './weather';

/**
 * Entity types that can be indexed for offline search.
 * Extends EntityType to include TRIP which is not part of entity linking.
 */
export type SearchableEntityType =
  | 'TRIP'
  | 'LOCATION'
  | 'ACTIVITY'
  | 'LODGING'
  | 'TRANSPORTATION'
  | 'JOURNAL_ENTRY'
  | 'PHOTO_ALBUM'
  | 'PHOTO';

// ============================================
// BASE OFFLINE RECORD TYPE
// ============================================

/**
 * Base record structure for offline storage.
 * All cached entities extend this structure.
 */
export interface OfflineRecord<T> {
  /** Primary key (string representation of database ID or local UUID) */
  id: string;
  /** The actual entity data */
  data: T;
  /** Unix timestamp of last synchronization with server */
  lastSync: number;
  /** Record version for conflict detection */
  version: number;
}

/**
 * Extended offline record with trip association.
 * Used for trip-scoped entities.
 */
export interface TripScopedOfflineRecord<T> extends OfflineRecord<T> {
  /** Trip ID this entity belongs to */
  tripId: string;
  /** Local UUID for offline-created entities (before server sync) */
  localId?: string;
}

// ============================================
// SYNC OPERATIONS
// ============================================

/** Types of sync operations */
export type SyncOperationType = 'create' | 'update' | 'delete';

/** Entity types that can be synced */
export type SyncEntityType =
  | 'trip'
  | 'location'
  | 'activity'
  | 'transportation'
  | 'lodging'
  | 'journal'
  | 'photo'
  | 'album'
  | 'entityLink'
  | 'tag'
  | 'tagAssignment'
  | 'companion'
  | 'tripCompanion'
  | 'checklist'
  | 'checklistItem'
  | 'locationCategory'
  | 'weatherData'
  | 'flightTracking'
  | 'dismissedValidationIssue';

/**
 * Represents a pending sync operation in the queue.
 * Created when user makes changes while offline.
 */
export interface SyncOperation {
  /** Auto-incremented ID in IndexedDB */
  id?: number;
  /** Type of operation */
  operation: SyncOperationType;
  /** Type of entity being modified */
  entityType: SyncEntityType;
  /** Server ID of the entity (for update/delete) */
  entityId: string;
  /** Local UUID for offline-created entities */
  localId?: string;
  /** Trip ID for trip-scoped entities */
  tripId: string;
  /** The data to sync (for create/update) */
  data: unknown;
  /** Unix timestamp when operation was queued */
  timestamp: number;
  /** Number of sync retry attempts */
  retryCount: number;
  /** Conflict data if detected during sync attempt */
  conflictData?: unknown;
}

// ============================================
// SYNC CONFLICTS
// ============================================

/** Status of a sync conflict */
export type ConflictStatus = 'pending' | 'resolved';

/** How a conflict was resolved */
export type ConflictResolution = 'local' | 'server' | 'merge';

/**
 * Represents a data conflict between local and server versions.
 * Occurs when same entity was modified both locally and on server.
 */
export interface SyncConflict {
  /** Auto-incremented ID in IndexedDB */
  id?: number;
  /** Type of entity with conflict */
  entityType: SyncEntityType;
  /** Entity ID with conflict */
  entityId: string;
  /** Local version of the data */
  localData: unknown;
  /** Server version of the data */
  serverData: unknown;
  /** Timestamp of local modification */
  localTimestamp: number;
  /** Timestamp of server modification */
  serverTimestamp: number;
  /** Current status of the conflict */
  status: ConflictStatus;
  /** How conflict was resolved (if resolved) */
  resolution?: ConflictResolution;
  /** Unix timestamp when conflict was resolved */
  resolvedAt?: number;
}

// ============================================
// OFFLINE SESSION
// ============================================

/**
 * Stores user session information for offline access.
 * Allows authentication state to persist when offline.
 */
export interface OfflineSession {
  /** Session identifier (typically 'current') */
  id: string;
  /** User's database ID */
  userId: number;
  /** User's display name */
  username: string;
  /** User's email address */
  email: string;
  /** User's timezone preference */
  timezone: string;
  /** Encrypted session token for offline validation */
  sessionToken: string;
  /** Unix timestamp when session was created */
  createdAt: number;
  /** Unix timestamp when session expires (extended for offline - 30 days) */
  expiresAt: number;
}

// ============================================
// ID MAPPING
// ============================================

/**
 * Maps local (temporary) IDs to server IDs.
 * Used when syncing offline-created entities.
 */
export interface IdMapping {
  /** Local UUID assigned when entity was created offline */
  localId: string;
  /** Server-assigned ID after successful sync */
  serverId: string;
  /** Type of entity */
  entityType: SyncEntityType;
  /** Unix timestamp when mapping was created */
  createdAt: number;
}

// ============================================
// LOCAL DRAFTS
// ============================================

/** Status of a local draft */
export type DraftStatus = 'draft' | 'pending_sync' | 'synced' | 'conflict';

/**
 * Stores local draft data for forms.
 * Preserves user input before save/sync.
 */
export interface LocalDraft {
  /** Unique draft identifier */
  id: string;
  /** Type of entity being drafted */
  entityType: SyncEntityType;
  /** Trip ID (if trip-scoped) */
  tripId?: string;
  /** Entity ID (if editing existing) */
  entityId?: string;
  /** Draft form data */
  data: unknown;
  /** Draft status */
  status: DraftStatus;
  /** Unix timestamp when draft was created */
  createdAt: number;
  /** Unix timestamp when draft was last updated */
  updatedAt: number;
}

// ============================================
// SEARCH INDEX
// ============================================

/**
 * Entry in the offline search index.
 * Enables client-side full-text search.
 */
export interface SearchIndexEntry {
  /** Composite key: `${entityType}:${entityId}` */
  id: string;
  /** Type of indexed entity */
  entityType: SearchableEntityType;
  /** Entity ID */
  entityId: string;
  /** Trip ID for filtering */
  tripId: string;
  /** Combined searchable content (normalized, lowercase) */
  searchableText: string;
  /** Normalized, lowercase text for searching (alias for searchableText) */
  searchText: string;
  /** Display title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Unix timestamp when entry was indexed */
  indexedAt: number;
}

// ============================================
// METADATA
// ============================================

/**
 * Generic key-value metadata storage.
 * Used for app settings, cache timestamps, etc.
 */
export interface MetadataEntry {
  /** Metadata key */
  key: string;
  /** Metadata value (any JSON-serializable data) */
  value: unknown;
}

// ============================================
// MEDIA CACHE TYPES
// ============================================

/**
 * Cached Immich photo/video data.
 * Stores thumbnails and metadata from Immich server.
 */
export interface ImmichCacheEntry {
  /** Immich asset ID */
  id: string;
  /** Asset type */
  type: 'image' | 'video';
  /** Thumbnail blob data */
  thumbnailBlob?: Blob;
  /** Full-size blob data (if cached) */
  fullBlob?: Blob;
  /** Asset metadata */
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    takenAt?: string;
    latitude?: number;
    longitude?: number;
  };
  /** Unix timestamp when cached */
  cachedAt: number;
  /** Unix timestamp when cache expires */
  expiresAt: number;
}

/**
 * Cached video data for offline playback.
 */
export interface VideoCacheEntry {
  /** Video ID (photo ID or immich asset ID) */
  id: string;
  /** Video source */
  source: 'local' | 'immich';
  /** Video blob data */
  videoBlob: Blob;
  /** Video duration in seconds */
  duration?: number;
  /** Video dimensions */
  width?: number;
  height?: number;
  /** Unix timestamp when cached */
  cachedAt: number;
  /** Total size in bytes */
  sizeBytes: number;
}

// ============================================
// STORE VALUE TYPES (for IndexedDB schema)
// ============================================

/** Trip store value */
export interface TripStoreValue {
  id: string;
  data: Trip;
  lastSync: number;
  version: number;
  downloadedForOffline: boolean;
}

/** Location store value */
export interface LocationStoreValue {
  id: string;
  tripId: string;
  data: Location;
  lastSync: number;
  localId?: string;
}

/** Activity store value */
export interface ActivityStoreValue {
  id: string;
  tripId: string;
  data: Activity;
  lastSync: number;
  localId?: string;
}

/** Transportation store value */
export interface TransportationStoreValue {
  id: string;
  tripId: string;
  data: Transportation;
  lastSync: number;
  localId?: string;
}

/** Lodging store value */
export interface LodgingStoreValue {
  id: string;
  tripId: string;
  data: Lodging;
  lastSync: number;
  localId?: string;
}

/** Journal store value */
export interface JournalStoreValue {
  id: string;
  tripId: string;
  data: JournalEntry;
  lastSync: number;
  localId?: string;
}

/** Photo store value */
export interface PhotoStoreValue {
  id: string;
  tripId: string;
  metadata: Photo;
  thumbnailCached: boolean;
  fullCached: boolean;
  lastSync: number;
}

/** Photo album store value */
export interface PhotoAlbumStoreValue {
  id: string;
  tripId: string;
  data: PhotoAlbum;
  lastSync: number;
}

/** Entity link store value */
export interface EntityLinkStoreValue {
  id: string;
  tripId: string;
  data: EntityLink;
  lastSync: number;
  localId?: string;
}

/** Trip tag store value */
export interface TripTagStoreValue {
  id: string;
  userId: string;
  data: Tag;
  lastSync: number;
}

/** Tag assignment store value */
export interface TagAssignmentStoreValue {
  id: string;
  tripId: string;
  tagId: string;
  lastSync: number;
}

/** Travel companion store value */
export interface TravelCompanionStoreValue {
  id: string;
  userId: string;
  data: Companion;
  lastSync: number;
}

/** Trip companion store value */
export interface TripCompanionStoreValue {
  id: string;
  tripId: string;
  companionId: string;
  lastSync: number;
}

/** Checklist store value */
export interface ChecklistStoreValue {
  id: string;
  tripId: string;
  data: Checklist;
  lastSync: number;
  localId?: string;
}

/** Checklist item store value */
export interface ChecklistItemStoreValue {
  id: string;
  checklistId: string;
  data: ChecklistItem;
  lastSync: number;
  localId?: string;
}

/** Location category store value */
export interface LocationCategoryStoreValue {
  id: string;
  userId: string;
  data: LocationCategory;
  lastSync: number;
}

/** Weather data store value */
export interface WeatherDataStoreValue {
  id: string;
  tripId: string;
  locationId: string;
  data: WeatherData;
  lastSync: number;
}

/** Flight tracking store value */
export interface FlightTrackingStoreValue {
  id: string;
  transportationId: string;
  data: FlightTracking;
  lastSync: number;
}

/** Dismissed validation issue store value */
export interface DismissedValidationIssueStoreValue {
  id: string;
  tripId: string;
  data: {
    id: number;
    tripId: number;
    issueType: string;
    issueId: string;
    dismissedAt: string;
  };
  lastSync: number;
}

// ============================================
// SYNC STATUS TYPES
// ============================================

/** Overall sync status for the app */
export type OverallSyncStatus = 'synced' | 'pending' | 'syncing' | 'error' | 'offline';

/**
 * Summary of sync queue status.
 */
export interface SyncQueueStatus {
  /** Number of pending operations */
  pendingCount: number;
  /** Number of unresolved conflicts */
  conflictCount: number;
  /** Overall sync status */
  status: OverallSyncStatus;
  /** Unix timestamp of last successful sync */
  lastSyncTime?: number;
  /** Error message if sync failed */
  lastError?: string;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Converts database numeric ID to string for IndexedDB.
 */
export type StringId<T> = T extends { id: number }
  ? Omit<T, 'id'> & { id: string }
  : T;

/**
 * Helper to convert all numeric IDs in an object to strings.
 */
export function toStringId(id: number | string): string {
  return String(id);
}

/**
 * Helper to convert string ID back to number for API calls.
 */
export function toNumericId(id: string): number {
  const num = parseInt(id, 10);
  if (isNaN(num)) {
    throw new Error(`Invalid numeric ID: ${id}`);
  }
  return num;
}

/**
 * Check if an ID is a local UUID (not yet synced to server).
 */
export function isLocalId(id: string): boolean {
  // UUIDs are 36 characters with hyphens
  return id.includes('-') && id.length === 36;
}
