/**
 * NextUpCard Component
 *
 * Shows the next upcoming event on the Trip Dashboard:
 * - If trip hasn't started: Shows first scheduled event
 * - If trip is in progress: Shows next event from current time
 * - If trip is completed: Shows "Trip Complete" summary
 *
 * Handles edge cases:
 * - No events scheduled: "No upcoming events - add your first activity!"
 * - All events passed: "Trip complete! View your memories"
 */

import { useMemo } from 'react';
import type { Activity } from '../../types/activity';
import type { Transportation } from '../../types/transportation';
import type { Lodging } from '../../types/lodging';
import type { TripStatusType } from '../../types/trip';
import { TripStatus } from '../../types/trip';
import {
  getNextUpEvent,
  getNextUpDisplayState,
  normalizeAllEvents,
} from '../../utils/tripDashboardUtils';
import EventPreview from './EventPreview';
import { PlusIcon, ChevronRightIcon } from '../icons';

interface NextUpCardProps {
  activities: Activity[];
  transportation: Transportation[];
  lodging: Lodging[];
  tripStatus: TripStatusType;
  tripStartDate: string | null;
  tripEndDate: string | null;
  tripTimezone: string;
  onNavigateToTab: (tabName: string) => void;
}

/**
 * Empty state component when there are no scheduled events
 */
function NoEventsState({ onAddActivity }: { onAddActivity: () => void }) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-amber-500 dark:text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        No upcoming events
      </h4>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Add your first activity to start planning your trip!
      </p>
      <button
        onClick={onAddActivity}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 dark:from-accent-400 dark:to-accent-600 text-white font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
      >
        <PlusIcon className="w-4 h-4" />
        Add Activity
      </button>
    </div>
  );
}

/**
 * Dream trip state - shows inspiration message
 */
function DreamTripState({
  event,
  tripTimezone,
  onNavigate,
}: {
  event: ReturnType<typeof getNextUpEvent>;
  tripTimezone: string;
  onNavigate: (tabName: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
        <span className="text-sm font-medium">Dream Trip</span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300">
        Start turning your dream into reality! Here&apos;s your first planned event:
      </p>

      {event && (
        <EventPreview
          event={event}
          tripTimezone={tripTimezone}
          onNavigate={() => onNavigate(event.tabName)}
          showRelativeTime={false}
        />
      )}
    </div>
  );
}

/**
 * Completed trip state - shows summary
 */
function CompletedTripState({
  activitiesCount,
  photosCount,
  onViewMemories,
  onViewTimeline,
}: {
  activitiesCount: number;
  photosCount: number;
  onViewMemories: () => void;
  onViewTimeline: () => void;
}) {
  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-green-500 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Trip Complete!
      </h4>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {activitiesCount > 0 || photosCount > 0
          ? `${activitiesCount} activities and ${photosCount} photos captured.`
          : 'View your trip memories and experiences.'}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={onViewMemories}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 dark:from-accent-400 dark:to-accent-600 text-white font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
        >
          View Photos
          <ChevronRightIcon className="w-4 h-4" />
        </button>
        <button
          onClick={onViewTimeline}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gold/30 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-navy-700 transition-colors"
        >
          View Timeline
        </button>
      </div>
    </div>
  );
}

/**
 * Main NextUpCard component
 */
export default function NextUpCard({
  activities,
  transportation,
  lodging,
  tripStatus,
  tripStartDate,
  tripEndDate,
  tripTimezone,
  onNavigateToTab,
}: NextUpCardProps) {
  // Calculate the next event and display state
  const { nextEvent, displayState, hasScheduledEvents } = useMemo(() => {
    const allEvents = normalizeAllEvents(activities, transportation, lodging);
    const scheduled = allEvents.filter((e) => e.dateTime !== null);
    const hasScheduled = scheduled.length > 0;

    const event = getNextUpEvent(
      activities,
      transportation,
      lodging,
      tripStatus,
      tripStartDate,
      tripEndDate
    );

    const state = getNextUpDisplayState(
      tripStatus,
      hasScheduled,
      tripStartDate,
      tripEndDate
    );

    return {
      nextEvent: event,
      displayState: state,
      hasScheduledEvents: hasScheduled,
    };
  }, [activities, transportation, lodging, tripStatus, tripStartDate, tripEndDate]);

  // Calculate counts for completed state
  const activitiesCount = activities.length;
  const photosCount = 0; // Would need to be passed as prop if needed

  // Determine the header based on state
  const getHeaderText = () => {
    switch (displayState) {
      case 'no_events':
        return 'Next Up';
      case 'dream':
        return 'Your Dream';
      case 'completed':
        return 'Trip Complete';
      case 'in_progress':
        return tripStatus === TripStatus.IN_PROGRESS ? 'Up Next' : 'Next Up';
      case 'upcoming':
      default:
        return 'First Event';
    }
  };

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
          {getHeaderText()}
        </h3>
        {hasScheduledEvents && displayState !== 'completed' && displayState !== 'no_events' && (
          <button
            onClick={() => onNavigateToTab('timeline')}
            className="text-sm text-primary-600 dark:text-gold hover:text-primary-700 dark:hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
          >
            View Timeline
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content based on state */}
      {displayState === 'no_events' && (
        <NoEventsState onAddActivity={() => onNavigateToTab('activities')} />
      )}

      {displayState === 'dream' && (
        <DreamTripState
          event={nextEvent}
          tripTimezone={tripTimezone}
          onNavigate={onNavigateToTab}
        />
      )}

      {displayState === 'completed' && (
        <CompletedTripState
          activitiesCount={activitiesCount}
          photosCount={photosCount}
          onViewMemories={() => onNavigateToTab('photos')}
          onViewTimeline={() => onNavigateToTab('timeline')}
        />
      )}

      {(displayState === 'upcoming' || displayState === 'in_progress') && nextEvent && (
        <EventPreview
          event={nextEvent}
          tripTimezone={tripTimezone}
          onNavigate={() => onNavigateToTab(nextEvent.tabName)}
          showRelativeTime={true}
        />
      )}

      {/* Quick status indicator for in-progress trips */}
      {displayState === 'in_progress' && tripStatus === TripStatus.IN_PROGRESS && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Trip in progress
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
