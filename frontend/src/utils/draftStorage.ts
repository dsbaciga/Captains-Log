/**
 * Utility for managing form draft auto-saves
 *
 * Primary storage: IndexedDB (for PWA offline support)
 * Fallback: localStorage (for browsers without IndexedDB)
 *
 * Provides a storage layer for persisting form data to prevent data loss
 * when browser crashes, user navigates away, or network issues occur.
 */

import {
  saveDraftToDb,
  loadDraftFromDb,
  clearDraftFromDb,
  clearAllDraftsForTripFromDb,
  cleanupExpiredDraftsFromDb,
  isIndexedDBAvailable,
  type DraftRecord,
} from '../lib/localStorageMigration';

const DRAFT_PREFIX = 'travel-life-draft-';
const DRAFT_EXPIRY_HOURS = 24;
const DRAFT_EXPIRY_MS = DRAFT_EXPIRY_HOURS * 60 * 60 * 1000;

// Cache whether IndexedDB is available
let indexedDBAvailable: boolean | null = null;

function checkIndexedDBAvailable(): boolean {
  if (indexedDBAvailable === null) {
    indexedDBAvailable = isIndexedDBAvailable();
  }
  return indexedDBAvailable;
}

/**
 * Structure for storing draft data (localStorage format for compatibility)
 */
export interface DraftData<T> {
  formData: T;
  savedAt: number; // timestamp in milliseconds
  tripId: string | number;
}

/**
 * Generates a storage key for a draft
 * @param entityType - Type of entity (activity, lodging, transportation, etc.)
 * @param mode - 'create' or 'edit'
 * @param id - tripId for create mode, entityId for edit mode
 */
export function getDraftKey(entityType: string, mode: 'create' | 'edit', id: string | number): string {
  return `${DRAFT_PREFIX}${entityType}-${mode}-${id}`;
}

/**
 * Save a draft to storage (IndexedDB primary, localStorage fallback)
 * @param key - Storage key (use getDraftKey to generate)
 * @param formData - The form data to save
 * @param tripId - The trip ID for reference
 */
export function saveDraft<T>(key: string, formData: T, tripId: string | number): void {
  const draftData: DraftData<T> = {
    formData,
    savedAt: Date.now(),
    tripId,
  };

  // Try IndexedDB first (async, fire-and-forget for save)
  if (checkIndexedDBAvailable()) {
    saveDraftToDb(key, draftData, DRAFT_EXPIRY_MS)
      .catch(error => {
        console.warn('IndexedDB save failed, using localStorage fallback:', error);
        saveToLocalStorage(key, draftData);
      });
  } else {
    // Fallback to localStorage
    saveToLocalStorage(key, draftData);
  }
}

/**
 * Save a draft synchronously to localStorage
 */
function saveToLocalStorage<T>(key: string, draftData: DraftData<T>): void {
  try {
    localStorage.setItem(key, JSON.stringify(draftData));
  } catch (error) {
    // Silently fail if localStorage is not available or quota exceeded
    console.warn('Could not save draft to localStorage:', error);
  }
}

/**
 * Load a draft from storage (checks IndexedDB first, then localStorage)
 * @param key - Storage key
 * @returns The draft data or null if not found/expired
 */
export function loadDraft<T>(key: string): DraftData<T> | null {
  // For synchronous loading (initial mount), check localStorage first
  // The hook will also check IndexedDB asynchronously
  return loadFromLocalStorage<T>(key);
}

/**
 * Load a draft asynchronously (tries IndexedDB first, then localStorage)
 * @param key - Storage key
 * @returns The draft data or null if not found/expired
 */
export async function loadDraftAsync<T>(key: string): Promise<DraftData<T> | null> {
  // Try IndexedDB first
  if (checkIndexedDBAvailable()) {
    try {
      const record = await loadDraftFromDb(key);
      if (record) {
        // Convert DraftRecord to DraftData format
        const data = record.data as DraftData<T>;
        if (data && data.formData !== undefined) {
          return data;
        }
        // Handle case where data was stored directly (not wrapped)
        return {
          formData: record.data as T,
          savedAt: record.savedAt,
          tripId: '',
        };
      }
    } catch (error) {
      console.warn('IndexedDB load failed, trying localStorage:', error);
    }
  }

  // Fallback to localStorage
  return loadFromLocalStorage<T>(key);
}

/**
 * Load a draft from localStorage
 */
function loadFromLocalStorage<T>(key: string): DraftData<T> | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const draftData: DraftData<T> = JSON.parse(stored);

    // Check if draft is expired
    if (Date.now() - draftData.savedAt > DRAFT_EXPIRY_MS) {
      clearDraft(key);
      return null;
    }

    return draftData;
  } catch (error) {
    console.warn('Could not load draft from localStorage:', error);
    return null;
  }
}

/**
 * Clear a specific draft from storage
 * @param key - Storage key
 */
export function clearDraft(key: string): void {
  // Clear from both stores to ensure complete cleanup

  // Clear from localStorage (sync)
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Could not clear draft from localStorage:', error);
  }

  // Clear from IndexedDB (async)
  if (checkIndexedDBAvailable()) {
    clearDraftFromDb(key).catch(error => {
      console.warn('Could not clear draft from IndexedDB:', error);
    });
  }
}

/**
 * Clear all drafts for a specific trip
 * @param tripId - The trip ID
 */
export function clearAllDraftsForTrip(tripId: string | number): void {
  // Clear from localStorage
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const draftData = JSON.parse(stored);
            if (String(draftData.tripId) === String(tripId)) {
              keysToRemove.push(key);
            }
          } catch {
            // Invalid JSON, skip
          }
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Could not clear trip drafts from localStorage:', error);
  }

  // Clear from IndexedDB
  if (checkIndexedDBAvailable()) {
    clearAllDraftsForTripFromDb(tripId).catch(error => {
      console.warn('Could not clear trip drafts from IndexedDB:', error);
    });
  }
}

/**
 * Clean up all expired drafts from storage
 * Call this on app load to prevent stale data accumulation
 */
export function cleanupExpiredDrafts(): void {
  // Clean up localStorage
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const draftData = JSON.parse(stored);
            if (now - draftData.savedAt > DRAFT_EXPIRY_MS) {
              keysToRemove.push(key);
            }
          } catch {
            // Invalid JSON, remove the key
            keysToRemove.push(key);
          }
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (keysToRemove.length > 0) {
      console.log(`Cleaned up ${keysToRemove.length} expired draft(s) from localStorage`);
    }
  } catch (error) {
    console.warn('Could not cleanup expired drafts from localStorage:', error);
  }

  // Clean up IndexedDB
  if (checkIndexedDBAvailable()) {
    cleanupExpiredDraftsFromDb()
      .then(count => {
        if (count > 0) {
          console.log(`Cleaned up ${count} expired draft(s) from IndexedDB`);
        }
      })
      .catch(error => {
        console.warn('Could not cleanup expired drafts from IndexedDB:', error);
      });
  }
}

/**
 * Check if a draft exists and is not expired
 * @param key - Storage key
 */
export function hasDraft(key: string): boolean {
  return loadDraft(key) !== null;
}

/**
 * Check if a draft exists asynchronously (checks both IndexedDB and localStorage)
 * @param key - Storage key
 */
export async function hasDraftAsync(key: string): Promise<boolean> {
  const draft = await loadDraftAsync(key);
  return draft !== null;
}

/**
 * Check if form data contains only default/empty values
 * Prevents saving drafts that are essentially empty
 * @param formData - The form data to check
 * @param defaultValues - The default/initial form values
 */
export function isFormEmpty<T extends object>(
  formData: T,
  defaultValues: T
): boolean {
  return Object.keys(formData).every((key) => {
    const value = (formData as Record<string, unknown>)[key];
    const defaultValue = (defaultValues as Record<string, unknown>)[key];

    // Handle undefined/null
    if (value === undefined || value === null || value === '') {
      return defaultValue === undefined || defaultValue === null || defaultValue === '';
    }

    // Handle strings - check if trimmed value is empty or equals default
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') return true;
      if (typeof defaultValue === 'string') {
        return trimmed === defaultValue.trim();
      }
      return false;
    }

    // For other types, compare directly
    return value === defaultValue;
  });
}

/**
 * Format a timestamp for display (e.g., "2 minutes ago")
 * @param timestamp - The timestamp in milliseconds
 */
export function formatDraftTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  }
}
