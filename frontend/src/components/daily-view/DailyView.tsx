import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Activity } from '../../types/activity';
import type { Transportation } from '../../types/transportation';
import type { Lodging } from '../../types/lodging';
import type { JournalEntry } from '../../types/journalEntry';
import type { Location } from '../../types/location';
import type { WeatherDisplay } from '../../types/weather';
import type { EntityType } from '../../types/entityLink';
import activityService from '../../services/activity.service';
import transportationService from '../../services/transportation.service';
import lodgingService from '../../services/lodging.service';
import journalService from '../../services/journalEntry.service';
import locationService from '../../services/location.service';
import entityLinkService from '../../services/entityLink.service';
import DayNavigator from './DayNavigator';
import ActivityCard from './ActivityCard';
import TransportationCard from './TransportationCard';
import LodgingCard from './LodgingCard';
import JournalCard from './JournalCard';
import EmptyDayPlaceholder from './EmptyDayPlaceholder';
import { getTimezoneAbbr } from './utils';

// Type for linked locations map: "ENTITY_TYPE:entityId" -> Location[]
type LinkedLocationsMap = Record<string, Location[]>;

interface DailyViewProps {
  tripId: number;
  tripTimezone?: string;
  userTimezone?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  weather?: Record<string, WeatherDisplay>;
  onRefresh?: () => void;
}

interface DayItem {
  type: 'activity' | 'transportation' | 'lodging' | 'journal' | 'location';
  dateTime: Date;
  data: Activity | Transportation | Lodging | JournalEntry | Location;
  // For lodging multi-day tracking
  lodgingContext?: {
    isCheckInDay: boolean;
    isCheckOutDay: boolean;
    nightNumber?: number;
    totalNights?: number;
  };
}

interface DayData {
  dayNumber: number;
  dateKey: string;
  displayDate: string;
  items: DayItem[];
  weather?: WeatherDisplay;
}

export default function DailyView({
  tripId,
  tripTimezone,
  userTimezone,
  tripStartDate,
  tripEndDate,
  weather,
}: DailyViewProps) {
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allDays, setAllDays] = useState<DayData[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [linkedLocationsMap, setLinkedLocationsMap] = useState<LinkedLocationsMap>({});

  // Generate all trip dates
  const generateAllTripDates = useCallback((): { dayNumber: number; dateKey: string; displayDate: string; date: Date }[] => {
    if (!tripStartDate || !tripEndDate) return [];

    const parseLocalDate = (dateStr: string): { year: number; month: number; day: number } => {
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return {
          year: parseInt(match[1], 10),
          month: parseInt(match[2], 10) - 1,
          day: parseInt(match[3], 10),
        };
      }
      const d = new Date(dateStr);
      return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
    };

    const startParts = parseLocalDate(tripStartDate);
    const endParts = parseLocalDate(tripEndDate);

    const dates: { dayNumber: number; dateKey: string; displayDate: string; date: Date }[] = [];
    const current = new Date(startParts.year, startParts.month, startParts.day, 12, 0, 0);
    const endDate = new Date(endParts.year, endParts.month, endParts.day, 12, 0, 0);

    const dateKeyFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tripTimezone,
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const displayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tripTimezone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    let dayNumber = 1;
    while (current <= endDate) {
      dates.push({
        dayNumber,
        dateKey: dateKeyFormatter.format(current),
        displayDate: displayFormatter.format(current),
        date: new Date(current),
      });
      current.setDate(current.getDate() + 1);
      dayNumber++;
      if (dates.length > 1000) break; // Safety limit
    }

    return dates;
  }, [tripStartDate, tripEndDate, tripTimezone]);

  // Get date string for comparison
  const getDateString = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tripTimezone,
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  };

  // Helper to build entity key
  const getEntityKey = useCallback((entityType: EntityType, entityId: number): string => {
    return `${entityType}:${entityId}`;
  }, []);

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all data including entity links in parallel
        const [activities, transportation, lodging, journal, locations, linkSummary] = await Promise.all([
          activityService.getActivitiesByTrip(tripId),
          transportationService.getTransportationByTrip(tripId),
          lodgingService.getLodgingByTrip(tripId),
          journalService.getJournalEntriesByTrip(tripId),
          locationService.getLocationsByTrip(tripId),
          entityLinkService.getTripLinkSummary(tripId).catch(() => ({})),
        ]);

        // Store locations for later lookup
        setAllLocations(locations);

        // Build linked locations map by fetching links for entities that have location links
        const locationsMap: LinkedLocationsMap = {};
        const entityTypes: EntityType[] = ['ACTIVITY', 'TRANSPORTATION', 'LODGING', 'JOURNAL_ENTRY'];

        // Get all entities that have location links based on link summary
        const linkFetchPromises: Promise<void>[] = [];

        for (const [key, summary] of Object.entries(linkSummary)) {
          if (summary.linkCounts.LOCATION && summary.linkCounts.LOCATION > 0) {
            const entityType = summary.entityType;
            const entityId = summary.entityId;

            if (entityTypes.includes(entityType)) {
              linkFetchPromises.push(
                entityLinkService.getLinksFrom(tripId, entityType, entityId, 'LOCATION')
                  .then((links) => {
                    const locationIds = links
                      .filter((link) => link.targetType === 'LOCATION')
                      .map((link) => link.targetId);
                    const linkedLocs = locations.filter((loc) => locationIds.includes(loc.id));
                    if (linkedLocs.length > 0) {
                      locationsMap[getEntityKey(entityType, entityId)] = linkedLocs;
                    }
                  })
                  .catch(() => {
                    // Silently ignore individual link fetch failures
                  })
              );
            }
          }
        }

        // Wait for all link fetches to complete
        await Promise.all(linkFetchPromises);
        setLinkedLocationsMap(locationsMap);

        const tripDates = generateAllTripDates();
        const dayDataMap: Record<string, DayItem[]> = {};

        // Initialize all days
        tripDates.forEach(({ dateKey }) => {
          dayDataMap[dateKey] = [];
        });

        // Add activities
        activities.forEach((activity) => {
          if (activity.startTime || activity.allDay) {
            const dateKey = activity.startTime
              ? getDateString(activity.startTime)
              : tripDates[0]?.dateKey;
            if (dateKey && dayDataMap[dateKey]) {
              dayDataMap[dateKey].push({
                type: 'activity',
                dateTime: activity.startTime
                  ? new Date(activity.startTime)
                  : new Date(tripDates[0].date),
                data: activity,
              });
            }
          }
        });

        // Add transportation
        transportation.forEach((trans) => {
          if (trans.departureTime) {
            const dateKey = getDateString(trans.departureTime);
            if (dayDataMap[dateKey]) {
              dayDataMap[dateKey].push({
                type: 'transportation',
                dateTime: new Date(trans.departureTime),
                data: trans,
              });
            }
          }
        });

        // Add lodging - appears on each day from check-in to check-out
        lodging.forEach((lodge) => {
          if (lodge.checkInDate && lodge.checkOutDate) {
            const checkInStr =
              typeof lodge.checkInDate === 'string'
                ? lodge.checkInDate.split('T')[0]
                : new Date(lodge.checkInDate).toISOString().split('T')[0];
            const checkOutStr =
              typeof lodge.checkOutDate === 'string'
                ? lodge.checkOutDate.split('T')[0]
                : new Date(lodge.checkOutDate).toISOString().split('T')[0];

            const [checkInYear, checkInMonth, checkInDay] = checkInStr.split('-').map(Number);
            const [checkOutYear, checkOutMonth, checkOutDay] = checkOutStr.split('-').map(Number);

            const checkInDate = new Date(checkInYear, checkInMonth - 1, checkInDay, 12, 0, 0);
            const checkOutDate = new Date(checkOutYear, checkOutMonth - 1, checkOutDay, 12, 0, 0);

            const totalNights = Math.round(
              (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            const current = new Date(checkInDate);
            let nightNumber = 1;

            while (current <= checkOutDate) {
              const dateKey = getDateString(current);
              const isCheckInDay = current.getTime() === checkInDate.getTime();
              const isCheckOutDay = current.getTime() === checkOutDate.getTime();

              if (dayDataMap[dateKey]) {
                dayDataMap[dateKey].push({
                  type: 'lodging',
                  dateTime: isCheckInDay
                    ? new Date(lodge.checkInDate)
                    : isCheckOutDay
                    ? new Date(lodge.checkOutDate)
                    : new Date(current),
                  data: lodge,
                  lodgingContext: {
                    isCheckInDay,
                    isCheckOutDay,
                    nightNumber: isCheckOutDay ? undefined : nightNumber,
                    totalNights: totalNights > 1 ? totalNights : undefined,
                  },
                });
              }

              if (!isCheckOutDay) {
                nightNumber++;
              }
              current.setDate(current.getDate() + 1);
            }
          } else if (lodge.checkInDate) {
            const dateKey = getDateString(lodge.checkInDate);
            if (dayDataMap[dateKey]) {
              dayDataMap[dateKey].push({
                type: 'lodging',
                dateTime: new Date(lodge.checkInDate),
                data: lodge,
                lodgingContext: {
                  isCheckInDay: true,
                  isCheckOutDay: false,
                },
              });
            }
          }
        });

        // Add journal entries (only standalone ones without activity/lodging/transportation links)
        journal.forEach((entry) => {
          if (entry.date) {
            // Only include standalone journal entries
            const entryAny = entry as Record<string, unknown>;
            const hasActivityLinks = Array.isArray(entryAny.activityAssignments) && (entryAny.activityAssignments as unknown[]).length > 0;
            const hasLodgingLinks = Array.isArray(entryAny.lodgingAssignments) && (entryAny.lodgingAssignments as unknown[]).length > 0;
            const hasTransportationLinks = Array.isArray(entryAny.transportationAssignments) && (entryAny.transportationAssignments as unknown[]).length > 0;

            if (!hasActivityLinks && !hasLodgingLinks && !hasTransportationLinks) {
              const dateKey = getDateString(entry.date);
              if (dayDataMap[dateKey]) {
                dayDataMap[dateKey].push({
                  type: 'journal',
                  dateTime: new Date(entry.date),
                  data: entry,
                });
              }
            }
          }
        });

        // Add locations with visit dates
        locations.forEach((location) => {
          if (location.visitDatetime) {
            const dateKey = getDateString(location.visitDatetime);
            if (dayDataMap[dateKey]) {
              dayDataMap[dateKey].push({
                type: 'location',
                dateTime: new Date(location.visitDatetime),
                data: location,
              });
            }
          }
        });

        // Build final day data array
        const daysData: DayData[] = tripDates.map(({ dayNumber, dateKey, displayDate }) => {
          const items = dayDataMap[dateKey] || [];
          // Sort items chronologically
          items.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

          return {
            dayNumber,
            dateKey,
            displayDate,
            items,
            weather: weather?.[dateKey],
          };
        });

        setAllDays(daysData);
      } catch (err) {
        console.error('Error loading daily view data:', err);
        setError('Failed to load trip data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tripId, generateAllTripDates, weather, getEntityKey]);

  // Current day data
  const currentDay = allDays[currentDayIndex];

  // Handle day change
  const handleDayChange = (dayNumber: number) => {
    setCurrentDayIndex(dayNumber - 1);
  };

  // Format dates for navigator
  const navigatorDates = useMemo(
    () =>
      allDays.map((day) => ({
        dayNumber: day.dayNumber,
        dateKey: day.dateKey,
        displayDate: day.displayDate,
      })),
    [allDays]
  );

  // Helper to get linked locations for an entity
  const getLinkedLocations = useCallback((entityType: EntityType, entityId: number): Location[] => {
    const key = getEntityKey(entityType, entityId);
    return linkedLocationsMap[key] || [];
  }, [linkedLocationsMap, getEntityKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading day view...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Data</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">{error}</p>
      </div>
    );
  }

  if (allDays.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>No trip dates defined. Please set trip start and end dates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Day Navigator */}
      <DayNavigator
        currentDay={currentDay?.dayNumber || 1}
        totalDays={allDays.length}
        currentDate={currentDay?.displayDate || ''}
        onDayChange={handleDayChange}
        allDates={navigatorDates}
      />

      {/* Day Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Day {currentDay?.dayNumber}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{currentDay?.displayDate}</p>
          </div>

          {/* Weather badge if available */}
          {currentDay?.weather && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
              <span className="text-xl">{currentDay.weather.icon}</span>
              <div className="text-sm">
                <div className="font-medium">
                  {currentDay.weather.high !== null && currentDay.weather.high !== undefined
                    ? Math.round(currentDay.weather.high)
                    : '--'}
                  °
                  {currentDay.weather.low !== null && currentDay.weather.low !== undefined && (
                    <span className="text-blue-500 dark:text-blue-400">
                      /{Math.round(currentDay.weather.low)}°
                    </span>
                  )}
                </div>
                {currentDay.weather.conditions && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    {currentDay.weather.conditions}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timezone indicator */}
          {tripTimezone && userTimezone && tripTimezone !== userTimezone && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">
                {getTimezoneAbbr(tripTimezone)}
              </span>
            </div>
          )}
        </div>

        {/* Day summary stats */}
        {currentDay && currentDay.items.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(() => {
              const stats = {
                activities: currentDay.items.filter((i) => i.type === 'activity').length,
                transportation: currentDay.items.filter((i) => i.type === 'transportation').length,
                lodging: currentDay.items.filter((i) => i.type === 'lodging').length,
                journal: currentDay.items.filter((i) => i.type === 'journal').length,
              };

              return (
                <>
                  {stats.activities > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      {stats.activities} {stats.activities === 1 ? 'activity' : 'activities'}
                    </span>
                  )}
                  {stats.transportation > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {stats.transportation}{' '}
                      {stats.transportation === 1 ? 'transport' : 'transports'}
                    </span>
                  )}
                  {stats.lodging > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      {stats.lodging} {stats.lodging === 1 ? 'lodging' : 'lodgings'}
                    </span>
                  )}
                  {stats.journal > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      {stats.journal} {stats.journal === 1 ? 'journal' : 'journals'}
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Day Content */}
      <div className="space-y-4">
        {currentDay?.items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <EmptyDayPlaceholder
              tripId={tripId}
              dayNumber={currentDay.dayNumber}
            />
          </div>
        ) : (
          currentDay?.items.map((item) => {
            switch (item.type) {
              case 'activity': {
                const activity = item.data as Activity;
                return (
                  <ActivityCard
                    key={`activity-${activity.id}`}
                    activity={activity}
                    tripId={tripId}
                    tripTimezone={tripTimezone}
                    linkedLocations={getLinkedLocations('ACTIVITY', activity.id)}
                  />
                );
              }
              case 'transportation': {
                const transportation = item.data as Transportation;
                return (
                  <TransportationCard
                    key={`transportation-${transportation.id}`}
                    transportation={transportation}
                    tripId={tripId}
                    tripTimezone={tripTimezone}
                    linkedLocations={getLinkedLocations('TRANSPORTATION', transportation.id)}
                  />
                );
              }
              case 'lodging': {
                const lodging = item.data as Lodging;
                return (
                  <LodgingCard
                    key={`lodging-${lodging.id}-${item.lodgingContext?.nightNumber || 0}`}
                    lodging={lodging}
                    tripId={tripId}
                    tripTimezone={tripTimezone}
                    dayContext={item.lodgingContext}
                    linkedLocations={getLinkedLocations('LODGING', lodging.id)}
                  />
                );
              }
              case 'journal': {
                const journal = item.data as JournalEntry;
                return (
                  <JournalCard
                    key={`journal-${journal.id}`}
                    journal={journal}
                    tripId={tripId}
                    tripTimezone={tripTimezone}
                    linkedLocations={getLinkedLocations('JOURNAL_ENTRY', journal.id)}
                  />
                );
              }
              default:
                return null;
            }
          })
        )}
      </div>
    </div>
  );
}
