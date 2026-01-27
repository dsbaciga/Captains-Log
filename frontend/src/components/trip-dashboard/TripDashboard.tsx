import type { Trip } from '../../types/trip';
import type { Activity } from '../../types/activity';
import type { Transportation } from '../../types/transportation';
import type { Lodging } from '../../types/lodging';
import type { Location } from '../../types/location';
import type { JournalEntry } from '../../types/journalEntry';
import type { Checklist } from '../../types/checklist';
import type { Companion } from '../../types/companion';
import DashboardHero from './DashboardHero';
import TripStats from '../TripStats';

interface TripDashboardProps {
  trip: Trip;
  coverPhotoUrl: string | null;
  activities: Activity[];
  transportation: Transportation[];
  lodging: Lodging[];
  locations: Location[];
  journalEntries: JournalEntry[];
  photosCount: number;
  checklists: Checklist[];
  companions: Companion[];
  onNavigateToTab: (tab: string) => void;
  className?: string;
}

/**
 * Main Trip Dashboard component.
 *
 * Serves as the central hub for trip information, providing an at-a-glance view of:
 * - Trip status and countdown/day indicator (Hero section)
 * - Recent activity
 * - Next upcoming event
 * - Quick actions based on trip status
 * - Trip statistics
 * - Today's itinerary (for in-progress trips)
 * - Checklists progress
 *
 * Layout:
 * - Desktop: Two-column layout with hero spanning full width
 * - Mobile: Single column stacked layout
 */
export default function TripDashboard({
  trip,
  coverPhotoUrl,
  activities,
  transportation,
  lodging,
  locations,
  journalEntries,
  photosCount,
  checklists,
  companions,
  onNavigateToTab,
  className = '',
}: TripDashboardProps) {
  // Calculate counts for stats
  const activitiesCount = activities.length;
  const transportationCount = transportation.length;
  const lodgingCount = lodging.length;
  const locationsCount = locations.length;
  const journalCount = journalEntries.length;
  const companionsCount = companions.length;

  // Calculate unscheduled items
  const unscheduledActivities = activities.filter((a) => !a.startTime && !a.allDay);
  const unscheduledTransportation = transportation.filter((t) => !t.departureTime);
  const unscheduledLodging = lodging.filter((l) => !l.checkInDate);
  const unscheduledCount =
    unscheduledActivities.length +
    unscheduledTransportation.length +
    unscheduledLodging.length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Hero Section - Full Width */}
      <DashboardHero
        trip={trip}
        coverPhotoUrl={coverPhotoUrl}
        className="animate-fade-in"
      />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Activity and Next Up */}
        <div className="lg:col-span-1 space-y-6">
          {/* Recent Activity Card - Placeholder for RecentActivityCard component */}
          <div className="card p-6 animate-fade-in stagger-1">
            <h3 className="font-body font-semibold text-lg text-charcoal dark:text-warm-gray mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-primary-500 dark:text-gold"
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
              Recent Activity
            </h3>
            {/* TODO: RecentActivityCard component will be implemented by another agent */}
            <div className="text-sm text-slate dark:text-gray-400 text-center py-8">
              <p>Recent activity will appear here</p>
              <p className="text-xs mt-1 opacity-70">
                Track changes to your trip
              </p>
            </div>
          </div>

          {/* Checklists Widget - Placeholder for ChecklistsWidget component */}
          {checklists.length > 0 && (
            <div className="card p-6 animate-fade-in stagger-3">
              <h3 className="font-body font-semibold text-lg text-charcoal dark:text-warm-gray mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary-500 dark:text-gold"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
                Checklists
              </h3>
              {/* TODO: ChecklistsWidget component will be implemented by another agent */}
              <div className="space-y-3">
                {checklists.slice(0, 3).map((checklist) => (
                  <div
                    key={checklist.id}
                    className="flex items-center justify-between p-3 bg-parchment dark:bg-navy-700/50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-charcoal dark:text-warm-gray">
                      {checklist.name}
                    </span>
                    {checklist.stats && (
                      <span className="text-xs text-slate dark:text-gray-400">
                        {checklist.stats.checked}/{checklist.stats.total}
                      </span>
                    )}
                  </div>
                ))}
                {checklists.length > 3 && (
                  <p className="text-xs text-slate dark:text-gray-400 text-center">
                    +{checklists.length - 3} more checklists
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Next Up and Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Next Up Card - Placeholder for NextUpCard component */}
          <div className="card p-6 animate-fade-in stagger-2">
            <h3 className="font-body font-semibold text-lg text-charcoal dark:text-warm-gray mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-primary-500 dark:text-gold"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              Next Up
            </h3>
            {/* TODO: NextUpCard component will be implemented by another agent */}
            <div className="text-sm text-slate dark:text-gray-400 text-center py-8">
              <p>Your next event will appear here</p>
              <p className="text-xs mt-1 opacity-70">
                Based on your scheduled activities, transport, and lodging
              </p>
            </div>
          </div>

          {/* Quick Actions Bar - Placeholder for QuickActionsBar component */}
          <div className="card p-6 animate-fade-in stagger-3">
            <h3 className="font-body font-semibold text-lg text-charcoal dark:text-warm-gray mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-primary-500 dark:text-gold"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Quick Actions
            </h3>
            {/* TODO: QuickActionsBar component will be implemented by another agent */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigateToTab('timeline')}
                className="btn-secondary text-sm"
              >
                View Timeline
              </button>
              <button
                onClick={() => onNavigateToTab('activities')}
                className="btn-secondary text-sm"
              >
                Add Activity
              </button>
              <button
                onClick={() => onNavigateToTab('photos')}
                className="btn-secondary text-sm"
              >
                Add Photos
              </button>
              <button
                onClick={() => onNavigateToTab('journal')}
                className="btn-secondary text-sm"
              >
                Write Journal
              </button>
            </div>
          </div>

          {/* Today's Itinerary - Placeholder for TodaysItinerary component */}
          {/* Only show for in-progress trips */}
          {trip.status === 'In Progress' && (
            <div className="card p-6 animate-fade-in stagger-4">
              <h3 className="font-body font-semibold text-lg text-charcoal dark:text-warm-gray mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary-500 dark:text-gold"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Today's Itinerary
              </h3>
              {/* TODO: TodaysItinerary component will be implemented by another agent */}
              <div className="text-sm text-slate dark:text-gray-400 text-center py-8">
                <p>Today's schedule will appear here</p>
                <p className="text-xs mt-1 opacity-70">
                  See what's planned for the day
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trip Stats Grid - Full Width */}
      <div className="card p-6 animate-fade-in stagger-4">
        <h3 className="font-body font-semibold text-lg text-charcoal dark:text-warm-gray mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary-500 dark:text-gold"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Trip at a Glance
        </h3>
        <TripStats
          locationsCount={locationsCount}
          photosCount={photosCount}
          activitiesCount={activitiesCount}
          transportationCount={transportationCount}
          lodgingCount={lodgingCount}
          journalCount={journalCount}
          companionsCount={companionsCount}
          unscheduledCount={unscheduledCount}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate}
          onNavigateToTab={onNavigateToTab}
        />
      </div>
    </div>
  );
}
