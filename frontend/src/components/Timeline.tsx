import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Activity } from '../types/activity';
import type { Transportation } from '../types/transportation';
import type { Lodging } from '../types/lodging';
import type { JournalEntry } from '../types/journalEntry';
import type { WeatherData, WeatherDisplay } from '../types/weather';
import activityService from '../services/activity.service';
import transportationService from '../services/transportation.service';
import lodgingService from '../services/lodging.service';
import journalService from '../services/journalEntry.service';
import weatherService from '../services/weather.service';
import WeatherCard from './WeatherCard';
import { getWeatherIcon } from '../utils/weatherIcons';
import toast from 'react-hot-toast';

interface TimelineProps {
  tripId: number;
  tripTimezone?: string;
  userTimezone?: string;
}

type TimelineItemType = 'activity' | 'transportation' | 'lodging' | 'journal';

interface TimelineItem {
  id: number;
  type: TimelineItemType;
  dateTime: Date;
  endDateTime?: Date;
  title: string;
  subtitle?: string;
  description?: string;
  location?: string;
  cost?: number;
  currency?: string;
  isAllDay?: boolean; // Flag for multi-day lodging entries
  showCheckInTime?: boolean; // Show check-in time
  showCheckOutTime?: boolean; // Show check-out time
  data: Activity | Transportation | Lodging | JournalEntry;
}

const Timeline = ({ tripId, tripTimezone, userTimezone }: TimelineProps) => {
  const navigate = useNavigate();
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [weatherData, setWeatherData] = useState<Record<string, WeatherData>>({});
  const [loading, setLoading] = useState(true);

  // Check if we should show dual timezones
  const showDualTimezone = tripTimezone && userTimezone && tripTimezone !== userTimezone;

  useEffect(() => {
    loadTimelineData();
  }, [tripId]);

  const loadTimelineData = async () => {
    setLoading(true);
    try {
      const [activities, transportation, lodging, journal, weather] = await Promise.all([
        activityService.getActivitiesByTrip(tripId),
        transportationService.getTransportationByTrip(tripId),
        lodgingService.getLodgingByTrip(tripId),
        journalService.getJournalEntriesByTrip(tripId),
        weatherService.getWeatherForTrip(tripId).catch(() => []), // Don't fail if weather unavailable
      ]);

      const items: TimelineItem[] = [];

      // Add activities
      activities.forEach((activity) => {
        if (activity.startTime) {
          items.push({
            id: activity.id,
            type: 'activity',
            dateTime: new Date(activity.startTime),
            endDateTime: activity.endTime ? new Date(activity.endTime) : undefined,
            title: activity.name,
            subtitle: activity.category || undefined,
            description: activity.description || undefined,
            location: activity.location?.name,
            cost: activity.cost || undefined,
            currency: activity.currency || undefined,
            data: activity,
          });
        }
      });

      // Add transportation
      transportation.forEach((trans) => {
        if (trans.departureTime) {
          items.push({
            id: trans.id,
            type: 'transportation',
            dateTime: new Date(trans.departureTime),
            endDateTime: trans.arrivalTime ? new Date(trans.arrivalTime) : undefined,
            title: `${trans.type.charAt(0).toUpperCase() + trans.type.slice(1)}`,
            subtitle: trans.carrier || undefined,
            description: `${trans.fromLocationName || 'Unknown'} → ${trans.toLocationName || 'Unknown'}`,
            cost: trans.cost || undefined,
            currency: trans.currency || undefined,
            data: trans,
          });
        }
      });

      // Add lodging - create an entry for each day from check-in to check-out
      lodging.forEach((lodge) => {
        if (lodge.checkInDate && lodge.checkOutDate) {
          const checkIn = new Date(lodge.checkInDate);
          const checkOut = new Date(lodge.checkOutDate);

          // Get date only (without time) for comparison
          const checkInDateOnly = new Date(checkIn.toDateString());
          const checkOutDateOnly = new Date(checkOut.toDateString());

          // Create an entry for each day of the stay
          let currentDate = new Date(checkInDateOnly);

          while (currentDate <= checkOutDateOnly) {
            const isCheckInDay = currentDate.getTime() === checkInDateOnly.getTime();
            const isCheckOutDay = currentDate.getTime() === checkOutDateOnly.getTime();

            // Set the time to check-in time on first day, midnight on other days
            let itemDateTime = new Date(currentDate);
            if (isCheckInDay) {
              itemDateTime = new Date(checkIn);
            }

            let subtitle = lodge.type.charAt(0).toUpperCase() + lodge.type.slice(1).replace(/_/g, ' ');

            if (isCheckInDay) {
              subtitle += ' (Check-in)';
            } else if (isCheckOutDay) {
              subtitle += ' (Check-out)';
            }

            items.push({
              id: lodge.id + currentDate.getTime(), // Unique ID for each day
              type: 'lodging',
              dateTime: itemDateTime,
              endDateTime: isCheckOutDay ? new Date(checkOut) : undefined,
              title: lodge.name,
              subtitle: subtitle,
              description: lodge.address || undefined,
              location: lodge.location?.name,
              cost: isCheckInDay ? lodge.cost || undefined : undefined, // Only show cost on check-in day
              currency: isCheckInDay ? lodge.currency : undefined,
              isAllDay: !isCheckInDay && !isCheckOutDay, // Middle days are all-day
              showCheckInTime: isCheckInDay,
              showCheckOutTime: isCheckOutDay,
              data: lodge,
            });

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
          }
        } else if (lodge.checkInDate) {
          // Fallback for lodging without check-out date
          items.push({
            id: lodge.id,
            type: 'lodging',
            dateTime: new Date(lodge.checkInDate),
            endDateTime: lodge.checkOutDate ? new Date(lodge.checkOutDate) : undefined,
            title: lodge.name,
            subtitle: lodge.type.charAt(0).toUpperCase() + lodge.type.slice(1).replace(/_/g, ' '),
            description: lodge.address || undefined,
            location: lodge.location?.name,
            cost: lodge.cost || undefined,
            currency: lodge.currency || undefined,
            data: lodge,
          });
        }
      });

      // Add journal entries
      journal.forEach((entry) => {
        if (entry.date) {
          items.push({
            id: entry.id,
            type: 'journal',
            dateTime: new Date(entry.date),
            title: entry.title || 'Untitled Entry',
            description: entry.content.substring(0, 150) + (entry.content.length > 150 ? '...' : ''),
            location: entry.locationAssignments?.[0]?.location?.name,
            data: entry,
          });
        }
      });

      // Sort by date/time
      items.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

      setTimelineItems(items);

      // Process weather data into a map by date
      const weatherByDate = weather.reduce((acc, w) => {
        const dateKey = new Date(w.date).toDateString();
        acc[dateKey] = w;
        return acc;
      }, {} as Record<string, WeatherData>);

      setWeatherData(weatherByDate);
    } catch (error) {
      toast.error('Failed to load timeline data');
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group items by day
  const groupedItems = timelineItems.reduce((acc, item) => {
    const dateKey = item.dateTime.toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, TimelineItem[]>);

  const formatTime = (date: Date, displayTimezone?: string, isTripTimezone?: boolean) => {
    if (displayTimezone && showDualTimezone) {
      if (isTripTimezone) {
        // For trip timezone, show the time as entered (stored UTC represents local time)
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      } else {
        // For user timezone, calculate the offset between trip and user timezone
        // Get offset for trip timezone
        const tripFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tripTimezone,
          hour: 'numeric',
          minute: 'numeric',
          hour12: false
        });

        // Get offset for user timezone
        const userFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: displayTimezone,
          hour: 'numeric',
          minute: 'numeric',
          hour12: false
        });

        // Get the displayed time parts
        const tripParts = tripFormatter.formatToParts(date);
        const userParts = userFormatter.formatToParts(date);

        const getTotalMinutes = (parts: Intl.DateTimeFormatPart[]) => {
          const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
          const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
          return hour * 60 + minute;
        };

        const tripMinutes = getTotalMinutes(tripParts);
        const userMinutes = getTotalMinutes(userParts);
        const offsetMinutes = userMinutes - tripMinutes;

        // Apply offset to the original date
        const adjustedDate = new Date(date.getTime() + offsetMinutes * 60 * 1000);

        return adjustedDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
    }
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getTimezoneAbbr = (timezone: string): string => {
    // Simple mapping for common timezones
    const abbrs: Record<string, string> = {
      'UTC': 'UTC',
      'America/New_York': 'EST/EDT',
      'America/Chicago': 'CST/CDT',
      'America/Denver': 'MST/MDT',
      'America/Los_Angeles': 'PST/PDT',
      'America/Anchorage': 'AKST/AKDT',
      'Pacific/Honolulu': 'HST',
      'Europe/London': 'GMT/BST',
      'Europe/Paris': 'CET/CEST',
      'Europe/Berlin': 'CET/CEST',
      'Asia/Tokyo': 'JST',
      'Asia/Shanghai': 'CST',
      'Asia/Dubai': 'GST',
      'Australia/Sydney': 'AEST/AEDT',
      'Pacific/Auckland': 'NZST/NZDT'
    };
    return abbrs[timezone] || timezone.split('/').pop() || timezone;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const transformWeatherData = (weather: WeatherData): WeatherDisplay => {
    return {
      date: weather.date,
      high: weather.temperatureHigh,
      low: weather.temperatureLow,
      conditions: weather.conditions,
      icon: getWeatherIcon(weather.conditions),
      precipitation: weather.precipitation,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
    };
  };

  const renderTimelineColumn = (items: TimelineItem[], timezone?: string, isTripTimezone?: boolean) => {
    return (
      <div className="flex-1">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

          <div className="space-y-6">
            {items.map((item) => (
              <div key={`${item.type}-${item.id}`} className="relative flex gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getTypeColor(item.type)} text-white flex items-center justify-center z-10`}>
                  {getIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        {item.isAllDay ? (
                          'All Day'
                        ) : item.showCheckInTime ? (
                          `Check-in: ${formatTime(item.dateTime, timezone, isTripTimezone)}`
                        ) : item.showCheckOutTime ? (
                          `Check-out: ${formatTime(item.endDateTime!, timezone, isTripTimezone)}`
                        ) : (
                          <>
                            {formatTime(item.dateTime, timezone, isTripTimezone)}
                            {item.endDateTime && ` - ${formatTime(item.endDateTime, timezone, isTripTimezone)}`}
                          </>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                      {item.subtitle && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.subtitle}</p>
                      )}
                    </div>
                    {item.cost && item.currency && (
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {item.currency} {item.cost.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {item.location && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {item.location}
                    </div>
                  )}

                  {item.description && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">{item.description}</p>
                  )}

                  {/* Show associated journal entries for activities, lodging, and transportation */}
                  {item.type !== 'journal' && 'journalAssignments' in item.data && item.data.journalAssignments && item.data.journalAssignments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Journal {item.data.journalAssignments.length === 1 ? 'Entry' : 'Entries'}:
                        </span>
                      </div>
                      <div className="space-y-2">
                        {item.data.journalAssignments.map((assignment: any) => (
                          <button
                            key={assignment.id}
                            onClick={() => navigate(`/trips/${tripId}/journal`)}
                            className="w-full text-left text-sm bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded p-2 transition-colors cursor-pointer"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">
                              {assignment.journal.title || 'Untitled Entry'}
                            </div>
                            {assignment.journal.content && (
                              <div className="text-gray-600 dark:text-gray-400 mt-1">
                                {assignment.journal.content.substring(0, 100)}
                                {assignment.journal.content.length > 100 ? '...' : ''}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const getIcon = (type: TimelineItemType) => {
    switch (type) {
      case 'activity':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'transportation':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'lodging':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case 'journal':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
    }
  };

  const getTypeColor = (type: TimelineItemType) => {
    switch (type) {
      case 'activity':
        return 'bg-blue-500';
      case 'transportation':
        return 'bg-green-500';
      case 'lodging':
        return 'bg-purple-500';
      case 'journal':
        return 'bg-orange-500';
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-900 dark:text-white">Loading timeline...</div>;
  }

  if (timelineItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No timeline items yet. Add activities, transportation, lodging, or journal entries to see them here.
      </div>
    );
  }

  return (
    <div>
      {/* Timezone headers at the top - only show when dual timezone is enabled */}
      {showDualTimezone && (
        <div className="flex gap-8 mb-6 sticky top-0 bg-white dark:bg-gray-900 z-30 py-4 border-b-2 border-gray-300 dark:border-gray-600">
          <div className="flex-1 text-center">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              {getTimezoneAbbr(tripTimezone!)} (Trip Timezone)
            </h3>
          </div>
          <div className="w-8 flex items-center justify-center">
            <div className="h-full w-px bg-gray-300 dark:bg-gray-600"></div>
          </div>
          <div className="flex-1 text-center">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              {getTimezoneAbbr(userTimezone!)} (Your Timezone)
            </h3>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(groupedItems).map(([dateKey, items]) => {
          const dayWeather = weatherData[dateKey];

          return (
            <div key={dateKey}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sticky top-16 bg-white dark:bg-gray-900 py-2 pl-4 border-b border-gray-200 dark:border-gray-700 z-10">
                {formatDate(dateKey)}
              </h3>

              {/* Weather Card */}
              {dayWeather && (
                <div className="mb-4">
                  <WeatherCard
                    weather={transformWeatherData(dayWeather)}
                    temperatureUnit="F"
                    compact={true}
                  />
                </div>
              )}

              {showDualTimezone ? (
                <div className="flex gap-8">
                  {renderTimelineColumn(items, tripTimezone, true)}
                  <div className="w-px bg-gray-300 dark:bg-gray-600"></div>
                  {renderTimelineColumn(items, userTimezone, false)}
                </div>
              ) : (
                renderTimelineColumn(items)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
