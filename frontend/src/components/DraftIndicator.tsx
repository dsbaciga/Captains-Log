import { formatDraftTime } from '../utils/draftStorage';

interface DraftIndicatorProps {
  /** Whether a save is currently in progress */
  isSaving?: boolean;
  /** Timestamp when the draft was last saved */
  lastSavedAt?: Date | null;
  /** Whether to show the indicator */
  show?: boolean;
}

/**
 * DraftIndicator displays a subtle status indicator for draft auto-saves.
 *
 * Shows "Saving..." during active saves and "Draft saved" with timestamp
 * after successful saves. Fades in/out smoothly.
 *
 * @example
 * ```tsx
 * <DraftIndicator
 *   isSaving={draft.isSaving}
 *   lastSavedAt={draft.lastSavedAt}
 *   show={draft.hasDraft}
 * />
 * ```
 */
export default function DraftIndicator({
  isSaving = false,
  lastSavedAt = null,
  show = false,
}: DraftIndicatorProps) {
  if (!show && !isSaving) return null;

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 text-xs
        transition-opacity duration-300
        ${isSaving ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}
      `}
      role="status"
      aria-live="polite"
    >
      {isSaving ? (
        <>
          {/* Pulsing dot for saving state */}
          <span className="w-2 h-2 bg-amber-500 dark:bg-amber-400 rounded-full animate-pulse" />
          <span>Saving...</span>
        </>
      ) : lastSavedAt ? (
        <>
          {/* Static dot for saved state */}
          <span className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full" />
          <span>Draft saved {formatDraftTime(lastSavedAt.getTime())}</span>
        </>
      ) : null}
    </div>
  );
}
