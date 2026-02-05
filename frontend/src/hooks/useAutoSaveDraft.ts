import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getDraftKey,
  saveDraft,
  loadDraft,
  loadDraftAsync,
  clearDraft,
  isFormEmpty,
} from '../utils/draftStorage';

export interface UseAutoSaveDraftOptions<T> {
  /** Unique key like "activity" or "lodging" */
  entityType: string;
  /** Trip ID for create mode, entity ID for edit mode */
  id: string | number;
  /** Whether this is edit mode (vs create mode) */
  isEditMode?: boolean;
  /** Trip ID (needed for storage reference) */
  tripId: string | number;
  /** Debounce delay in milliseconds (default: 1000ms) */
  debounceMs?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Default/initial form values for empty check */
  defaultValues?: T;
}

export interface UseAutoSaveDraftResult<T> {
  /** The saved draft data, if any */
  savedDraft: T | null;
  /** Whether a draft exists for this form (includes drafts created during this session) */
  hasDraft: boolean;
  /** Whether a draft existed BEFORE this form opened (from a previous session) - use this for restore prompts */
  initialDraftExists: boolean;
  /** Timestamp when draft was last saved */
  lastSavedAt: Date | null;
  /** Restore the draft and return the form data */
  restoreDraft: () => T | null;
  /** Restore the draft asynchronously (checks IndexedDB) */
  restoreDraftAsync: () => Promise<T | null>;
  /** Clear the draft from storage */
  clearDraft: () => void;
  /** Manually trigger a save (useful before navigation) */
  saveDraftNow: (formData: T) => void;
  /** Whether the draft is currently being saved */
  isSaving: boolean;
  /** Whether draft loading is in progress */
  isLoading: boolean;
}

/**
 * Hook for auto-saving form data to IndexedDB (with localStorage fallback)
 *
 * Automatically saves form data after a debounce period, prevents data loss
 * when browser crashes, user navigates away, or network issues occur.
 *
 * Primary storage: IndexedDB (for PWA offline support)
 * Fallback: localStorage (for browsers without IndexedDB)
 *
 * @example
 * ```tsx
 * const {
 *   hasDraft,
 *   savedDraft,
 *   restoreDraft,
 *   clearDraft: clearSavedDraft,
 *   lastSavedAt,
 * } = useAutoSaveDraft(formValues, {
 *   entityType: 'activity',
 *   id: tripId,
 *   tripId,
 *   defaultValues: initialFormValues,
 * });
 *
 * // On form mount, check for existing draft
 * useEffect(() => {
 *   if (hasDraft && !isEditing) {
 *     setShowDraftPrompt(true);
 *   }
 * }, [hasDraft, isEditing]);
 *
 * // On successful submit, clear the draft
 * const handleSubmit = async () => {
 *   await saveToServer();
 *   clearSavedDraft();
 * };
 * ```
 */
export function useAutoSaveDraft<T extends object>(
  formData: T,
  options: UseAutoSaveDraftOptions<T>
): UseAutoSaveDraftResult<T> {
  const {
    entityType,
    id,
    isEditMode = false,
    tripId,
    debounceMs = 1000,
    enabled = true,
    defaultValues,
  } = options;

  const draftKey = getDraftKey(entityType, isEditMode ? 'edit' : 'create', id);

  const [savedDraft, setSavedDraft] = useState<T | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasDraftState, setHasDraftState] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Track if a draft existed when the form first opened (for restore prompt)
  const [initialDraftExists, setInitialDraftExists] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFormDataRef = useRef<T>(formData);
  const isInitializedRef = useRef(false);
  // Track if we've already checked for initial draft (prevents re-checking)
  const hasCheckedInitialDraftRef = useRef(false);

  // Check for existing draft on mount (both localStorage and IndexedDB)
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    // First, check localStorage synchronously for immediate UI
    const localDraft = loadDraft<T>(draftKey);
    if (localDraft) {
      setSavedDraft(localDraft.formData);
      setLastSavedAt(new Date(localDraft.savedAt));
      setHasDraftState(true);
      if (!hasCheckedInitialDraftRef.current) {
        setInitialDraftExists(true);
        hasCheckedInitialDraftRef.current = true;
      }
    }

    // Then check IndexedDB asynchronously (may have more recent data)
    loadDraftAsync<T>(draftKey)
      .then(asyncDraft => {
        if (asyncDraft) {
          // Use the more recent draft (compare timestamps)
          const shouldUseAsyncDraft = !localDraft || asyncDraft.savedAt > localDraft.savedAt;
          if (shouldUseAsyncDraft) {
            setSavedDraft(asyncDraft.formData);
            setLastSavedAt(new Date(asyncDraft.savedAt));
            setHasDraftState(true);
            if (!hasCheckedInitialDraftRef.current) {
              setInitialDraftExists(true);
              hasCheckedInitialDraftRef.current = true;
            }
          }
        } else if (!localDraft) {
          // No draft in either storage
          setSavedDraft(null);
          setLastSavedAt(null);
          setHasDraftState(false);
          if (!hasCheckedInitialDraftRef.current) {
            setInitialDraftExists(false);
            hasCheckedInitialDraftRef.current = true;
          }
        }
      })
      .catch(error => {
        console.warn('Failed to load draft from IndexedDB:', error);
        // Already have localStorage result, so just mark as checked
        if (!hasCheckedInitialDraftRef.current) {
          setInitialDraftExists(!!localDraft);
          hasCheckedInitialDraftRef.current = true;
        }
      })
      .finally(() => {
        isInitializedRef.current = true;
        setIsLoading(false);
      });
  }, [draftKey, enabled]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!enabled || !isInitializedRef.current) return;

    // Clear any pending save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't save if form is empty/default
    if (defaultValues && isFormEmpty(formData, defaultValues)) {
      return;
    }

    // Check if form data has actually changed
    if (JSON.stringify(formData) === JSON.stringify(lastFormDataRef.current)) {
      return;
    }

    lastFormDataRef.current = formData;

    // Schedule save after debounce
    debounceTimerRef.current = setTimeout(() => {
      setIsSaving(true);
      saveDraft(draftKey, formData, tripId);
      setSavedDraft(formData);
      setLastSavedAt(new Date());
      setHasDraftState(true);
      setIsSaving(false);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData, draftKey, tripId, debounceMs, enabled, defaultValues]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Synchronous restore (localStorage only - for immediate use)
  const restoreDraft = useCallback((): T | null => {
    const draft = loadDraft<T>(draftKey);
    return draft?.formData || null;
  }, [draftKey]);

  // Async restore (checks both IndexedDB and localStorage)
  const restoreDraftAsync = useCallback(async (): Promise<T | null> => {
    const draft = await loadDraftAsync<T>(draftKey);
    return draft?.formData || null;
  }, [draftKey]);

  const clearDraftCallback = useCallback(() => {
    clearDraft(draftKey);
    setSavedDraft(null);
    setLastSavedAt(null);
    setHasDraftState(false);
    setInitialDraftExists(false);
  }, [draftKey]);

  const saveDraftNow = useCallback(
    (data: T) => {
      if (!enabled) return;

      // Clear any pending debounced save
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Don't save if form is empty/default
      if (defaultValues && isFormEmpty(data, defaultValues)) {
        return;
      }

      setIsSaving(true);
      saveDraft(draftKey, data, tripId);
      setSavedDraft(data);
      setLastSavedAt(new Date());
      setHasDraftState(true);
      setIsSaving(false);
      lastFormDataRef.current = data;
    },
    [draftKey, tripId, enabled, defaultValues]
  );

  return {
    savedDraft,
    hasDraft: hasDraftState,
    initialDraftExists,
    lastSavedAt,
    restoreDraft,
    restoreDraftAsync,
    clearDraft: clearDraftCallback,
    saveDraftNow,
    isSaving,
    isLoading,
  };
}
