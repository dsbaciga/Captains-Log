import { formatDraftTime } from '../utils/draftStorage';

interface DraftRestorePromptProps {
  /** Whether to show the prompt */
  isOpen: boolean;
  /** Timestamp when the draft was saved */
  savedAt?: Date | null;
  /** Callback when user clicks "Restore" */
  onRestore: () => void;
  /** Callback when user clicks "Discard" */
  onDiscard: () => void;
  /** Optional entity type for display (e.g., "activity", "lodging") */
  entityType?: string;
}

/**
 * DraftRestorePrompt shows a banner prompting the user to restore or discard
 * a previously saved draft.
 *
 * Appears at the top of the form when an unsaved draft is detected.
 *
 * @example
 * ```tsx
 * <DraftRestorePrompt
 *   isOpen={showDraftPrompt}
 *   savedAt={draft.lastSavedAt}
 *   onRestore={() => {
 *     const data = draft.restoreDraft();
 *     if (data) setFormData(data);
 *     setShowDraftPrompt(false);
 *   }}
 *   onDiscard={() => {
 *     draft.clearDraft();
 *     setShowDraftPrompt(false);
 *   }}
 *   entityType="activity"
 * />
 * ```
 */
export default function DraftRestorePrompt({
  isOpen,
  savedAt,
  onRestore,
  onDiscard,
  entityType,
}: DraftRestorePromptProps) {
  if (!isOpen) return null;

  const entityName = entityType || 'form';
  const timeAgo = savedAt ? formatDraftTime(savedAt.getTime()) : 'recently';

  return (
    <div
      className="
        mb-4 p-3 rounded-lg
        bg-primary-50 dark:bg-navy-800/80
        border border-primary-200 dark:border-gold/20
        animate-fade-in
      "
      role="alert"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Icon and message */}
        <div className="flex items-start gap-2 flex-1">
          <span className="text-primary-600 dark:text-gold text-lg flex-shrink-0">
            {/* Document with clock icon */}
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </span>
          <div className="text-sm font-body">
            <p className="font-medium text-primary-800 dark:text-gold">
              Unsaved draft found
            </p>
            <p className="text-primary-700 dark:text-warm-gray mt-0.5">
              You have an unsaved {entityName} draft from {timeAgo}. Would you like to restore it?
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-shrink-0 sm:self-center">
          <button
            type="button"
            onClick={onDiscard}
            className="btn-secondary text-sm py-1.5 px-3"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onRestore}
            className="btn-primary text-sm py-1.5 px-3"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
