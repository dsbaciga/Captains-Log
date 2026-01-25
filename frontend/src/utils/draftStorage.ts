/**
 * Utility for managing form draft auto-saves in localStorage
 *
 * Provides a storage layer for persisting form data to prevent data loss
 * when browser crashes, user navigates away, or network issues occur.
 */

const DRAFT_PREFIX = 'travel-life-draft-';
const DRAFT_EXPIRY_HOURS = 24;

/**
 * Structure for storing draft data
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
 * Save a draft to localStorage
 * @param key - Storage key (use getDraftKey to generate)
 * @param formData - The form data to save
 * @param tripId - The trip ID for reference
 */
export function saveDraft<T>(key: string, formData: T, tripId: string | number): void {
  try {
    const draftData: DraftData<T> = {
      formData,
      savedAt: Date.now(),
      tripId,
    };
    localStorage.setItem(key, JSON.stringify(draftData));
  } catch (error) {
    // Silently fail if localStorage is not available or quota exceeded
    console.warn('Could not save draft to localStorage:', error);
  }
}

/**
 * Load a draft from localStorage
 * @param key - Storage key
 * @returns The draft data or null if not found/expired
 */
export function loadDraft<T>(key: string): DraftData<T> | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const draftData: DraftData<T> = JSON.parse(stored);

    // Check if draft is expired
    const expiryMs = DRAFT_EXPIRY_HOURS * 60 * 60 * 1000;
    if (Date.now() - draftData.savedAt > expiryMs) {
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
 * Clear a specific draft from localStorage
 * @param key - Storage key
 */
export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Could not clear draft from localStorage:', error);
  }
}

/**
 * Clear all drafts for a specific trip
 * @param tripId - The trip ID
 */
export function clearAllDraftsForTrip(tripId: string | number): void {
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
}

/**
 * Clean up all expired drafts from localStorage
 * Call this on app load to prevent stale data accumulation
 */
export function cleanupExpiredDrafts(): void {
  try {
    const expiryMs = DRAFT_EXPIRY_HOURS * 60 * 60 * 1000;
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const draftData = JSON.parse(stored);
            if (now - draftData.savedAt > expiryMs) {
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
      console.log(`Cleaned up ${keysToRemove.length} expired draft(s)`);
    }
  } catch (error) {
    console.warn('Could not cleanup expired drafts:', error);
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
