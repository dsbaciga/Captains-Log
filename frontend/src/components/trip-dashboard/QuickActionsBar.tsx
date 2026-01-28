import { useState } from 'react';
import { TripStatus } from '../../types/trip';
import { SpinnerIcon } from '../icons';

interface QuickActionsBarProps {
  tripStatus: string;
  onNavigateToTab: (tabName: string, options?: { action?: string }) => void;
  onStatusChange: (newStatus: string) => void | Promise<void>;
  onPrintItinerary: () => void;
}

interface ActionButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant: 'primary' | 'secondary';
  loading?: boolean;
}

/**
 * QuickActionsBar - Contextual actions based on trip status
 *
 * Shows different action buttons depending on the current trip status:
 * - Dream: Start Planning, Add Inspiration Photos, Set Dates
 * - Planning: Add Activity, Book Lodging, Add Transport, View Timeline
 * - Planned: Start Trip, Print Itinerary, Share Trip, Final Checklist
 * - In Progress: Add Photo, Write Journal, View Timeline, Quick Add
 * - Completed: View Photos, Read Journal, Print Itinerary, Duplicate Trip
 */
export default function QuickActionsBar({
  tripStatus,
  onNavigateToTab,
  onStatusChange,
  onPrintItinerary,
}: QuickActionsBarProps): React.ReactNode {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setLoadingAction(`status-${newStatus}`);
    try {
      await onStatusChange(newStatus);
    } finally {
      setLoadingAction(null);
    }
  };

  // Icon components for actions
  const icons = {
    planning: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    photos: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    calendar: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    activity: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    lodging: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    transport: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
    timeline: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
    play: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    print: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
    ),
    share: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
    checklist: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    journal: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    quickAdd: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    duplicate: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  };

  // Get actions based on trip status
  const getActionsForStatus = (): ActionButton[] => {
    switch (tripStatus) {
      case TripStatus.DREAM:
        return [
          {
            id: 'start-planning',
            label: 'Start Planning',
            icon: icons.planning,
            onClick: () => handleStatusChange(TripStatus.PLANNING),
            variant: 'primary',
            loading: loadingAction === `status-${TripStatus.PLANNING}`,
          },
          {
            id: 'add-photos',
            label: 'Add Inspiration Photos',
            icon: icons.photos,
            onClick: () => onNavigateToTab('photos', { action: 'upload' }),
            variant: 'secondary',
          },
          {
            id: 'set-dates',
            label: 'Set Dates',
            icon: icons.calendar,
            onClick: () => onNavigateToTab('edit'),
            variant: 'secondary',
          },
        ];

      case TripStatus.PLANNING:
        return [
          {
            id: 'add-activity',
            label: 'Add Activity',
            icon: icons.activity,
            onClick: () => onNavigateToTab('activities', { action: 'add' }),
            variant: 'primary',
          },
          {
            id: 'book-lodging',
            label: 'Book Lodging',
            icon: icons.lodging,
            onClick: () => onNavigateToTab('lodging', { action: 'add' }),
            variant: 'secondary',
          },
          {
            id: 'add-transport',
            label: 'Add Transport',
            icon: icons.transport,
            onClick: () => onNavigateToTab('transportation', { action: 'add' }),
            variant: 'secondary',
          },
          {
            id: 'view-timeline',
            label: 'View Timeline',
            icon: icons.timeline,
            onClick: () => onNavigateToTab('timeline'),
            variant: 'secondary',
          },
        ];

      case TripStatus.PLANNED:
        return [
          {
            id: 'start-trip',
            label: 'Start Trip',
            icon: icons.play,
            onClick: () => handleStatusChange(TripStatus.IN_PROGRESS),
            variant: 'primary',
            loading: loadingAction === `status-${TripStatus.IN_PROGRESS}`,
          },
          {
            id: 'print-itinerary',
            label: 'Print Itinerary',
            icon: icons.print,
            onClick: onPrintItinerary,
            variant: 'secondary',
          },
          {
            id: 'share-trip',
            label: 'Share Trip',
            icon: icons.share,
            onClick: () => onNavigateToTab('share'),
            variant: 'secondary',
          },
          {
            id: 'final-checklist',
            label: 'Final Checklist',
            icon: icons.checklist,
            onClick: () => onNavigateToTab('checklists'),
            variant: 'secondary',
          },
        ];

      case TripStatus.IN_PROGRESS:
        return [
          {
            id: 'add-photo',
            label: 'Add Photo',
            icon: icons.photos,
            onClick: () => onNavigateToTab('photos', { action: 'upload' }),
            variant: 'primary',
          },
          {
            id: 'write-journal',
            label: 'Write Journal',
            icon: icons.journal,
            onClick: () => onNavigateToTab('journal', { action: 'add' }),
            variant: 'secondary',
          },
          {
            id: 'view-timeline',
            label: 'View Timeline',
            icon: icons.timeline,
            onClick: () => onNavigateToTab('timeline'),
            variant: 'secondary',
          },
          {
            id: 'quick-add',
            label: 'Quick Add',
            icon: icons.quickAdd,
            onClick: () => setShowQuickAddMenu(!showQuickAddMenu),
            variant: 'secondary',
          },
        ];

      case TripStatus.COMPLETED:
        return [
          {
            id: 'view-photos',
            label: 'View Photos',
            icon: icons.photos,
            onClick: () => onNavigateToTab('photos'),
            variant: 'primary',
          },
          {
            id: 'read-journal',
            label: 'Read Journal',
            icon: icons.journal,
            onClick: () => onNavigateToTab('journal'),
            variant: 'secondary',
          },
          {
            id: 'print-itinerary',
            label: 'Print Itinerary',
            icon: icons.print,
            onClick: onPrintItinerary,
            variant: 'secondary',
          },
          {
            id: 'duplicate-trip',
            label: 'Duplicate Trip',
            icon: icons.duplicate,
            onClick: () => onNavigateToTab('duplicate'),
            variant: 'secondary',
          },
        ];

      case TripStatus.CANCELLED:
        return [
          {
            id: 'view-details',
            label: 'View Details',
            icon: icons.timeline,
            onClick: () => onNavigateToTab('timeline'),
            variant: 'secondary',
          },
          {
            id: 'duplicate-trip',
            label: 'Duplicate Trip',
            icon: icons.duplicate,
            onClick: () => onNavigateToTab('duplicate'),
            variant: 'secondary',
          },
        ];

      default:
        return [];
    }
  };

  const actions = getActionsForStatus();

  // Quick Add menu items for In Progress trips
  const quickAddItems = [
    { id: 'activity', label: 'Activity', icon: icons.activity, tab: 'activities' },
    { id: 'photo', label: 'Photo', icon: icons.photos, tab: 'photos' },
    { id: 'journal', label: 'Journal Entry', icon: icons.journal, tab: 'journal' },
    { id: 'location', label: 'Location', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, tab: 'locations' },
  ];

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="animate-fade-in">
      {/* Actions Bar */}
      <div className="relative">
        <div
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:flex-wrap md:overflow-visible"
          role="toolbar"
          aria-label="Quick actions"
        >
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.loading}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
                whitespace-nowrap transition-all duration-200 flex-shrink-0
                min-h-[44px] min-w-[44px]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  action.variant === 'primary'
                    ? 'btn-primary'
                    : 'btn-secondary'
                }
              `}
              aria-busy={action.loading}
            >
              {action.loading ? (
                <SpinnerIcon className="w-4 h-4" />
              ) : (
                action.icon
              )}
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Quick Add Dropdown Menu */}
        {showQuickAddMenu && tripStatus === TripStatus.IN_PROGRESS && (
          <>
            {/* Backdrop to close menu */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowQuickAddMenu(false)}
              aria-hidden="true"
            />

            {/* Dropdown Menu */}
            <div
              className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-navy-800 rounded-xl shadow-lg border border-gray-200 dark:border-gold/20 py-2 min-w-[180px] animate-scale-in"
              role="menu"
              aria-label="Quick add options"
            >
              {quickAddItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigateToTab(item.tab, { action: 'add' });
                    setShowQuickAddMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-warm-gray hover:bg-gray-100 dark:hover:bg-navy-700 transition-colors"
                  role="menuitem"
                >
                  <span className="text-primary-500 dark:text-gold">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
