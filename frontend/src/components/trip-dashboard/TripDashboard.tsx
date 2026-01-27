import type { Trip } from '../../types/trip';
import type { Activity } from '../../types/activity';
import type { Transportation } from '../../types/transportation';
import type { Lodging } from '../../types/lodging';
import type { Location } from '../../types/location';
import type { JournalEntry } from '../../types/journalEntry';
import type { Checklist } from '../../types/checklist';
import type { Companion } from '../../types/companion';
import type { Photo } from '../../types/photo';
import DashboardHero from './DashboardHero';
import TripStats from '../TripStats';
import RecentActivityCard from './RecentActivityCard';
import NextUpCard from './NextUpCard';
import QuickActionsBar from './QuickActionsBar';
import TodaysItinerary from './TodaysItinerary';
import ChecklistsWidget from './ChecklistsWidget';

interface TripDashboardProps {
  trip: Trip;
  coverPhotoUrl: string | null;
  activities: Activity[];
  transportation: Transportation[];
  lodging: Lodging[];
  locations: Location[];
  journalEntries: JournalEntry[];
  photos: Photo[];
  photosCount: number;
  checklists: Checklist[];
  companions: Companion[];
  onNavigateToTab: (tab: string, options?: { action?: string; scrollToDate?: string }) => void;
  onStatusChange: (newStatus: string) => Promise<void>;
  onPrintItinerary: () => void;
  onToggleChecklistItem: (checklistId: number, itemId: number, completed: boolean) => Promise<void>;
  onNavigateToEntity: (entityType: string, entityId: string) => void;
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
  photos,
  photosCount,
  checklists,
  companions,
  onNavigateToTab,
  onStatusChange,
  onPrintItinerary,
  onToggleChecklistItem,
  onNavigateToEntity,
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

  // Get trip timezone with fallback
  const tripTimezone = trip.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Handle event click from TodaysItinerary
  const handleEventClick = (eventType: string, eventId: string) => {
    // Map event type to tab name
    const tabMap: Record<string, string> = {
      activity: 'activities',
      transportation: 'transportation',
      lodging: 'lodging',
    };
    const tabName = tabMap[eventType] || eventType;
    onNavigateToTab(tabName);
    // The onNavigateToEntity callback can be used for more specific navigation
    onNavigateToEntity(eventType, eventId);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Hero Section - Full Width */}
      <DashboardHero
        trip={trip}
        coverPhotoUrl={coverPhotoUrl}
        className="animate-fade-in"
      />

      {/* Quick Actions Bar - Full Width */}
      <div className="animate-fade-in stagger-1">
        <QuickActionsBar
          tripStatus={trip.status}
          onNavigateToTab={onNavigateToTab}
          onStatusChange={onStatusChange}
          onPrintItinerary={onPrintItinerary}
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Activity and Checklists */}
        <div className="lg:col-span-1 space-y-6">
          {/* Recent Activity Card */}
          <div className="animate-fade-in stagger-2">
            <RecentActivityCard
              activities={activities}
              transportation={transportation}
              lodging={lodging}
              locations={locations}
              journal={journalEntries}
              photos={photos}
              onNavigateToEntity={onNavigateToEntity}
            />
          </div>

          {/* Checklists Widget */}
          {checklists.length > 0 && (
            <div className="animate-fade-in stagger-3">
              <ChecklistsWidget
                checklists={checklists}
                onToggleItem={onToggleChecklistItem}
                onNavigateToChecklists={() => onNavigateToTab('checklists')}
              />
            </div>
          )}
        </div>

        {/* Right Column - Next Up and Today's Itinerary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Next Up Card */}
          <div className="animate-fade-in stagger-2">
            <NextUpCard
              activities={activities}
              transportation={transportation}
              lodging={lodging}
              tripStatus={trip.status}
              tripStartDate={trip.startDate}
              tripEndDate={trip.endDate}
              tripTimezone={tripTimezone}
              onNavigateToTab={onNavigateToTab}
            />
          </div>

          {/* Today's Itinerary - Only show for in-progress trips */}
          {trip.status === 'In Progress' && (
            <div className="animate-fade-in stagger-3">
              <TodaysItinerary
                activities={activities}
                transportation={transportation}
                lodging={lodging}
                tripTimezone={tripTimezone}
                onEventClick={handleEventClick}
                onNavigateToTimeline={(date) => onNavigateToTab('timeline', { scrollToDate: date })}
              />
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
            aria-hidden="true"
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
