/**
 * ActivityItem - Individual activity row for the Recent Activity Card
 *
 * Displays a single recent activity with:
 * - Icon based on action type
 * - Entity name/description
 * - Relative timestamp
 * - Click handler for navigation
 * - Subtle hover effect
 */

import {
  type ActivityEntityType,
  type ActivityActionType,
  getRelativeTimestamp,
} from '../../utils/tripDashboardUtils';

interface ActivityItemProps {
  entityType: ActivityEntityType;
  entityId: number;
  actionType: ActivityActionType;
  name: string;
  timestamp: string;
  onNavigateToEntity: (entityType: string, entityId: string) => void;
}

/**
 * Get action label for display
 */
function getActionLabel(actionType: ActivityActionType, entityType: ActivityEntityType): string {
  switch (actionType) {
    case 'added':
      return 'Added';
    case 'updated':
      return 'Updated';
    case 'uploaded':
      return ''; // Photo uploads already include the action in the name
    case 'linked':
      return 'Linked';
    case 'journal':
      return entityType === 'journal' ? 'New' : '';
    default:
      return '';
  }
}

/**
 * Get entity type label for display
 */
function getEntityTypeLabel(entityType: ActivityEntityType): string {
  switch (entityType) {
    case 'activity':
      return 'activity';
    case 'transportation':
      return 'transport';
    case 'lodging':
      return 'lodging';
    case 'location':
      return 'location';
    case 'journal':
      return 'journal entry';
    case 'photo':
      return ''; // Photo uploads already include the type in the name
    default:
      return '';
  }
}

/**
 * Get icon for action type
 */
function ActionIcon({ actionType }: { actionType: ActivityActionType }) {
  const baseClasses = 'w-4 h-4 flex-shrink-0';

  switch (actionType) {
    case 'added':
      return (
        <svg
          className={`${baseClasses} text-green-500 dark:text-green-400`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      );

    case 'updated':
      return (
        <svg
          className={`${baseClasses} text-blue-500 dark:text-blue-400`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      );

    case 'uploaded':
      return (
        <svg
          className={`${baseClasses} text-purple-500 dark:text-purple-400`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );

    case 'linked':
      return (
        <svg
          className={`${baseClasses} text-amber-500 dark:text-gold`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      );

    case 'journal':
      return (
        <svg
          className={`${baseClasses} text-indigo-500 dark:text-indigo-400`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      );

    default:
      return (
        <svg
          className={`${baseClasses} text-slate dark:text-warm-gray`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
  }
}

export function ActivityItem({
  entityType,
  entityId,
  actionType,
  name,
  timestamp,
  onNavigateToEntity,
}: ActivityItemProps) {
  const actionLabel = getActionLabel(actionType, entityType);
  const entityTypeLabel = getEntityTypeLabel(entityType);
  const relativeTime = getRelativeTimestamp(timestamp);

  // Build display text
  let displayText = name;
  if (actionLabel && entityTypeLabel) {
    displayText = `${actionLabel} ${entityTypeLabel}: ${name}`;
  } else if (actionLabel) {
    displayText = `${actionLabel}: ${name}`;
  }

  // For photo uploads, the name already contains the full description
  if (actionType === 'uploaded') {
    displayText = name;
  }

  const handleClick = () => {
    onNavigateToEntity(entityType, entityId.toString());
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="group flex items-start gap-3 p-2 -mx-2 rounded-lg cursor-pointer
                 transition-all duration-200
                 hover:bg-parchment dark:hover:bg-navy-700
                 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-primary-500/50 dark:focus-visible:ring-gold/50"
    >
      {/* Action Icon */}
      <div className="mt-0.5">
        <ActionIcon actionType={actionType} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-charcoal dark:text-warm-gray truncate group-hover:text-primary-600 dark:group-hover:text-gold transition-colors">
          {displayText}
        </p>
        <p className="text-xs text-slate dark:text-slate mt-0.5">
          {relativeTime}
        </p>
      </div>

      {/* Chevron indicator on hover */}
      <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg
          className="w-4 h-4 text-slate dark:text-warm-gray"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </div>
  );
}

export default ActivityItem;
