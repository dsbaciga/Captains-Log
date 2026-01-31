import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getDraftKey,
  saveDraft,
  loadDraft,
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
  /** Clear the draft from storage */
  clearDraft: () => void;
  /** Manually trigger a save (useful before navigation) */
  saveDraftNow: (formData: T) => void;
  /** Whether the draft is currently being saved */
  isSaving: boolean;
}

/**
 * Hook for auto-saving form data to localStorage
 *
 * Automatically saves form data after a debounce period, prevents data loss
 * when browser crashes, user navigates away, or network issues occur.
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
  // Track if a draft existed when the form first opened (for restore prompt)
  const [initialDraftExists, setInitialDraftExists] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFormDataRef = useRef<T>(formData);
  const isInitializedRef = useRef(false);
  // Track if we've already checked for initial draft (prevents re-checking)
  const hasCheckedInitialDraftRef = useRef(false);

  // Check for existing draft on mount
  useEffect(() => {
    if (!enabled) return;

    const existingDraft = loadDraft<T>(draftKey);
    if (existingDraft) {
      setSavedDraft(existingDraft.formData);
      setLastSavedAt(new Date(existingDraft.savedAt));
      setHasDraftState(true);
      // Only set initialDraftExists on first check (not when draftKey changes)
      if (!hasCheckedInitialDraftRef.current) {
        setInitialDraftExists(true);
        hasCheckedInitialDraftRef.current = true;
      }
    } else {
      setSavedDraft(null);
      setLastSavedAt(null);
      setHasDraftState(false);
      // Mark as checked even if no draft exists
      if (!hasCheckedInitialDraftRef.current) {
        setInitialDraftExists(false);
        hasCheckedInitialDraftRef.current = true;
      }
    }
    isInitializedRef.current = true;
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

  const restoreDraft = useCallback((): T | null => {
    const draft = loadDraft<T>(draftKey);
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
    clearDraft: clearDraftCallback,
    saveDraftNow,
    isSaving,
  };
}
