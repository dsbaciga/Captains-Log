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
  /**
   * Save only on blur events instead of debounced auto-save.
   * When true, call triggerSave() from onBlur handlers.
   * This prevents focus loss during typing. (default: true)
   */
  saveOnBlur?: boolean;
}

export interface UseAutoSaveDraftResult<T> {
  /** The saved draft data, if any */
  savedDraft: T | null;
  /** Whether a draft exists for this form */
  hasDraft: boolean;
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
  /**
   * Trigger a save using current form data.
   * Call this from onBlur handlers when saveOnBlur is true.
   */
  triggerSave: () => void;
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
    saveOnBlur = true,
  } = options;

  const draftKey = getDraftKey(entityType, isEditMode ? 'edit' : 'create', id);

  const [savedDraft, setSavedDraft] = useState<T | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasDraftState, setHasDraftState] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFormDataRef = useRef<T>(formData);
  const isInitializedRef = useRef(false);

  // Always keep the ref updated (no effect needed, just update on every render)
  lastFormDataRef.current = formData;

  // Check for existing draft on mount
  useEffect(() => {
    if (!enabled) return;

    const existingDraft = loadDraft<T>(draftKey);
    if (existingDraft) {
      setSavedDraft(existingDraft.formData);
      setLastSavedAt(new Date(existingDraft.savedAt));
      setHasDraftState(true);
    } else {
      setSavedDraft(null);
      setLastSavedAt(null);
      setHasDraftState(false);
    }
    isInitializedRef.current = true;
  }, [draftKey, enabled]);

  // Debounced auto-save effect (only active when saveOnBlur is false)
  useEffect(() => {
    // Completely skip this effect when saveOnBlur is enabled
    if (saveOnBlur) return;
    if (!enabled || !isInitializedRef.current) return;

    // Clear any pending save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't save if form is empty/default
    if (defaultValues && isFormEmpty(formData, defaultValues)) {
      return;
    }

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
  }, [saveOnBlur, formData, draftKey, tripId, debounceMs, enabled, defaultValues]);

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

  // Trigger save using current form data (for onBlur handlers)
  // Only saves to localStorage - no state updates to avoid re-renders
  const triggerSave = useCallback(() => {
    if (!enabled) return;

    const currentData = lastFormDataRef.current;

    // Don't save if form is empty/default
    if (defaultValues && isFormEmpty(currentData, defaultValues)) {
      return;
    }

    // Only save to localStorage - no React state updates
    // This prevents re-renders that would steal focus
    saveDraft(draftKey, currentData, tripId);
  }, [draftKey, tripId, enabled, defaultValues]);

  return {
    savedDraft,
    hasDraft: hasDraftState,
    lastSavedAt,
    restoreDraft,
    clearDraft: clearDraftCallback,
    saveDraftNow,
    isSaving,
    triggerSave,
  };
}
