import { useState, useEffect, useCallback } from 'react';
import type { UseAutoSaveDraftResult } from './useAutoSaveDraft';

/**
 * Options for the useDraftRestore hook
 */
export interface UseDraftRestoreOptions<T extends object> {
  /** The auto-save draft hook result */
  draft: UseAutoSaveDraftResult<T>;
  /** Callback to apply restored form data */
  setAllFields: (data: T) => void;
  /** Whether the form is currently visible */
  isFormOpen: boolean;
  /** Whether the form is in edit mode (drafts only restored for create mode) */
  isEditMode: boolean;
  /**
   * Optional callback invoked after draft data is restored. Use this to
   * set additional UI state (e.g., expanding collapsible sections when
   * the restored draft contains values in optional fields).
   */
  onRestored?: (data: T) => void;
}

/**
 * Return value from the useDraftRestore hook
 */
export interface UseDraftRestoreResult {
  /** Whether the draft restore prompt should be shown */
  showDraftPrompt: boolean;
  /** Setter for draft prompt visibility (needed by resetForm to dismiss prompt) */
  setShowDraftPrompt: (show: boolean) => void;
  /** Handler to restore the saved draft into the form */
  handleRestoreDraft: () => void;
  /** Handler to discard the saved draft */
  handleDiscardDraft: () => void;
}

/**
 * Hook that encapsulates the draft restore/discard pattern shared across
 * manager components (LodgingManager, TransportationManager, JournalManager).
 *
 * This hook:
 * 1. Watches for an existing draft when the form opens in create mode
 * 2. Exposes a prompt state to show/hide the DraftRestorePrompt component
 * 3. Provides restore and discard handlers
 *
 * @example
 * ```tsx
 * const draft = useAutoSaveDraft(values, { ... });
 * const { showDraftPrompt, handleRestoreDraft, handleDiscardDraft } = useDraftRestore({
 *   draft,
 *   setAllFields,
 *   isFormOpen: manager.showForm,
 *   isEditMode: !!manager.editingId,
 *   onRestored: (data) => {
 *     if (data.notes || data.cost) setShowMoreOptions(true);
 *   },
 * });
 *
 * // In JSX:
 * <DraftRestorePrompt
 *   isOpen={showDraftPrompt && !manager.editingId}
 *   savedAt={draft.lastSavedAt}
 *   onRestore={handleRestoreDraft}
 *   onDiscard={handleDiscardDraft}
 *   entityType="lodging"
 * />
 * ```
 */
export function useDraftRestore<T extends object>({
  draft,
  setAllFields,
  isFormOpen,
  isEditMode,
  onRestored,
}: UseDraftRestoreOptions<T>): UseDraftRestoreResult {
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);

  // Check for existing draft when form opens in create mode.
  // Uses initialDraftExists to only show prompt for drafts from previous sessions.
  //
  // Note on timing: initialDraftExists is set asynchronously in useAutoSaveDraft
  // (inside a useEffect that checks localStorage synchronously then IndexedDB async).
  // This is safe because draft.initialDraftExists is in the dependency array, so
  // React will re-run this effect when the value transitions from false -> true
  // after the draft check completes. We also gate on !draft.isLoading to avoid
  // showing the prompt before both storage backends have been checked.
  useEffect(() => {
    if (isFormOpen && !isEditMode && !draft.isLoading && draft.initialDraftExists) {
      setShowDraftPrompt(true);
    }
  }, [isFormOpen, isEditMode, draft.isLoading, draft.initialDraftExists]);

  const handleRestoreDraft = useCallback(() => {
    const restoredData = draft.restoreDraft();
    if (restoredData) {
      setAllFields(restoredData);
      onRestored?.(restoredData);
    }
    setShowDraftPrompt(false);
  }, [draft, setAllFields, onRestored]);

  const handleDiscardDraft = useCallback(() => {
    draft.clearDraft();
    setShowDraftPrompt(false);
  }, [draft]);

  return {
    showDraftPrompt,
    setShowDraftPrompt,
    handleRestoreDraft,
    handleDiscardDraft,
  };
}
