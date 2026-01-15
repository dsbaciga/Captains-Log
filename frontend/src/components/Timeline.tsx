import { useState, useEffect, useMemo } from 'react';
import type { Activity } from '../types/activity';
import type { Transportation } from '../types/transportation';
import type { Lodging } from '../types/lodging';
import type { Location } from '../types/location';
import type { WeatherData, WeatherDisplay } from '../types/weather';
import activityService from '../services/activity.service';
import transportationService from '../services/transportation.service';
import lodgingService from '../services/lodging.service';
import journalService from '../services/journalEntry.service';
import weatherService from '../services/weather.service';
import locationService from '../services/location.service';
import TimelineEditModal from './TimelineEditModal';
import { getWeatherIcon } from '../utils/weatherIcons';
import toast from 'react-hot-toast';
import { debugLogger } from '../utils/debugLogger';

// New timeline components
import {
  TimelineDaySection,
  TimelineFilters,
  MobileTimezoneToggle,
  getDateStringInTimezone,
} from './timeline';
import type { TimelineItem, TimelineItemType, DayGroup, DayStats } from './timeline/types';
import { useTripLinkSummary } from '../hooks/useTripLinkSummary';

interface TimelineProps {
  tripId: number;
  tripTimezone?: string;
  userTimezone?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  tripStatus?: string;
  onNavigateToTab?: (
    tab: 'activities' | 'transportation' | 'lodging' | 'journal',
    itemId?: number
  ) => void;
  onRefresh?: () => void;
}

const Timeline = ({
  tripId,
  tripTimezone,
  userTimezone,
  tripStartDate,
  tripEndDate,
  // These props are kept for API compatibility but not currently used
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tripStatus: _tripStatus,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onNavigateToTab: _onNavigateToTab,
  onRefresh,
}: TimelineProps) => {
  // Create scoped logger for this component
  const logger = debugLogger.createScopedLogger('Timeline');

  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [weatherData, setWeatherData] = useState<Record<string, WeatherData>>({});
  const [loading, setLoading] = useState(true);
  const [mobileActiveTimezone, setMobileActiveTimezone] = useState<'trip' | 'user'>('trip');
  const [visibleTypes, setVisibleTypes] = useState<Set<TimelineItemType>>(
    new Set(['activity', 'transportation', 'lodging', 'journal'])
  );
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  // View mode state
  const [viewMode, setViewMode] = useState<'standard' | 'compact'>(() => {
    const saved = localStorage.getItem('timeline-view-mode');
    return saved === 'compact' || saved === 'standard' ? saved : 'standard';
  });

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [allLodgings, setAllLodgings] = useState<Lodging[]>([]);
  const [allTransportations, setAllTransportations] = useState<Transportation[]>([]);
  const [refreshingWeather, setRefreshingWeather] = useState(false);

  // Entity link summary hook
  const { summaryMap, invalidate: invalidateLinkSummary } = useTripLinkSummary(tripId);

  // Check if we should show dual timezones
  const showDualTimezone = tripTimezone && userTimezone && tripTimezone !== userTimezone;

  // Toggle filter type
  const toggleType = (type: TimelineItemType) => {
    setVisibleTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  // Toggle view mode
  const toggleViewMode = (mode: 'standard' | 'compact') => {
    setViewMode(mode);
    localStorage.setItem('timeline-view-mode', mode);
  };

  // Toggle day collapse
  const toggleDay = (dateKey: string) => {
    setCollapsedDays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  // Expand all days
  const expandAllDays = () => {
    setCollapsedDays(new Set());
  };

  // Collapse all days
  const collapseAllDays = () => {
    if (!allGroupedItems) return;
    const allDateKeys = Object.keys(allGroupedItems);
    setCollapsedDays(new Set(allDateKeys));
  };

  // Handle edit
  const handleEdit = async (item: TimelineItem) => {
    if (locations.length === 0) {
      try {
        const locs = await locationService.getLocationsByTrip(tripId);
        setLocations(locs);
      } catch (error) {
        console.error('Failed to load locations:', error);
      }
    }

    if (item.type === 'journal') {
      try {
        const [activities, lodgings, transportations] = await Promise.all([
          activityService.getActivitiesByTrip(tripId),
          lodgingService.getLodgingByTrip(tripId),
          transportationService.getTransportationByTrip(tripId),
        ]);
        setAllActivities(activities);
        setAllLodgings(lodgings);
        setAllTransportations(transportations);
      } catch (error) {
        console.error('Failed to load trip entities:', error);
      }
    }

    setEditingItem(item);
    setEditModalOpen(true);
  };

  // Handle modal save
  const handleEditSave = () => {
    loadTimelineData();
    onRefresh?.();
  };

  // Handle modal close
  const handleEditClose = () => {
    setEditModalOpen(false);
    setEditingItem(null);
  };

  // Handle delete
  const handleDelete = async (item: TimelineItem) => {
    const itemId = item.data.id;

    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      return;
    }

    try {
      switch (item.type) {
        case 'activity':
          await activityService.deleteActivity(itemId);
          break;
        case 'transportation':
          await transportationService.deleteTransportation(itemId);
          break;
        case 'lodging':
          await lodgingService.deleteLodging(itemId);
          break;
        case 'journal':
          await journalService.deleteJournalEntry(itemId);
          break;
      }

      toast.success(`${item.type.charAt(0).toUpperCase() + item.type.slice(1)} deleted`);
      loadTimelineData();
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(`Failed to delete ${item.type}`);
    }
  };

  // Handle link update
  const handleLinkUpdate = () => {
    invalidateLinkSummary();
  };

  useEffect(() => {
    loadTimelineData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const loadTimelineData = async () => {
    logger.log('🔄 Starting loadTimelineData', { operation: 'loadTimelineData', data: { tripId } });
    setLoading(true);
    try {
      logger.log('📡 Fetching timeline data from API...', { operation: 'loadTimelineData.fetch' });

      const [activities, transportation, lodging, journal, weather] = await Promise.all([
        activityService.getActivitiesByTrip(tripId),
        transportationService.getTransportationByTrip(tripId),
        lodgingService.getLodgingByTrip(tripId),
        journalService.getJournalEntriesByTrip(tripId),
        weatherService.getWeatherForTrip(tripId).catch(() => []),
      ]);

      logger.log('✅ API data received', {
        operation: 'loadTimelineData.received',
        data: {
          activitiesCount: activities?.length ?? 'null/undefined',
          transportationCount: transportation?.length ?? 'null/undefined',
          lodgingCount: lodging?.length ?? 'null/undefined',
          journalCount: journal?.length ?? 'null/undefined',
          weatherCount: weather?.length ?? 'null/undefined',
        }
      });

      // Log data structures
      logger.logDataStructure('activities', activities, 'loadTimelineData.validate');
      logger.logDataStructure('transportation', transportation, 'loadTimelineData.validate');
      logger.logDataStructure('lodging', lodging, 'loadTimelineData.validate');
      logger.logDataStructure('journal', journal, 'loadTimelineData.validate');
      logger.logDataStructure('weather', weather, 'loadTimelineData.validate');

      const items: TimelineItem[] = [];
      logger.log('📝 Starting timeline items processing', { operation: 'loadTimelineData.process' });

      // Add activities
      logger.log('Processing activities array', {
        operation: 'loadTimelineData.activities',
        data: { count: activities?.length, isArray: Array.isArray(activities) }
      });
      if (Array.isArray(activities)) {
        activities.forEach((activity, index) => {
          if (!activity) {
            logger.log(`⚠️ Skipping null/undefined activity at index ${index}`, { operation: 'loadTimelineData.activities' });
            return;
          }
        if (activity.startTime) {
          let durationMinutes: number | undefined;
          if (activity.startTime && activity.endTime) {
            const start = new Date(activity.startTime);
            const end = new Date(activity.endTime);
            durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
          }

          items.push({
            id: activity.id,
            type: 'activity',
            dateTime: new Date(activity.startTime),
            endDateTime: activity.endTime ? new Date(activity.endTime) : undefined,
            title: activity.name,
            subtitle: activity.category || undefined,
            description: activity.description || undefined,
            location: activity.location?.name,
            locationCoords:
              activity.location?.latitude && activity.location?.longitude
                ? {
                    latitude: Number(activity.location.latitude),
                    longitude: Number(activity.location.longitude),
                  }
                : undefined,
            cost: activity.cost || undefined,
            currency: activity.currency || undefined,
            confirmationNumber: activity.bookingReference || undefined,
            durationMinutes,
            photoAlbums: activity.photoAlbums?.map((album) => ({
              id: album.id,
              name: album.name,
              _count: album._count,
            })),
            data: activity,
          });
        }
        });
        logger.log(`✅ Processed ${items.length} activities`, { operation: 'loadTimelineData.activities.complete' });
      } else {
        logger.log('⚠️ Activities is not an array', {
          operation: 'loadTimelineData.activities.invalid',
          data: { type: typeof activities, value: activities }
        });
      }

      // Add transportation
      logger.log('Processing transportation array', {
        operation: 'loadTimelineData.transportation',
        data: { count: transportation?.length, isArray: Array.isArray(transportation) }
      });
      if (Array.isArray(transportation)) {
        transportation.forEach((trans, index) => {
          if (!trans) {
            logger.log(`⚠️ Skipping null/undefined transportation at index ${index}`, { operation: 'loadTimelineData.transportation' });
            return;
          }
        if (trans.departureTime) {
          const getLocationDisplay = (
            location: typeof trans.fromLocation,
            locationId: number | null,
            locationName: string | null
          ): string => {
            if (location?.name) {
              if (location.address) {
                return `${location.name} (${location.address})`;
              }
              return location.name;
            }
            if (locationName) return locationName;
            if (locationId) return `Location #${locationId} (deleted?)`;
            return 'Unknown';
          };

          let durationMinutes = trans.durationMinutes || undefined;
          if (!durationMinutes && trans.departureTime && trans.arrivalTime) {
            const start = new Date(trans.departureTime);
            const end = new Date(trans.arrivalTime);
            durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
          }

          items.push({
            id: trans.id,
            type: 'transportation',
            dateTime: new Date(trans.departureTime),
            endDateTime: trans.arrivalTime ? new Date(trans.arrivalTime) : undefined,
            title: `${trans.type.charAt(0).toUpperCase() + trans.type.slice(1)}`,
            subtitle: trans.carrier || undefined,
            description: `${getLocationDisplay(
              trans.fromLocation,
              trans.fromLocationId,
              trans.fromLocationName
            )} → ${getLocationDisplay(trans.toLocation, trans.toLocationId, trans.toLocationName)}`,
            cost: trans.cost || undefined,
            currency: trans.currency || undefined,
            startTimezone: trans.startTimezone || undefined,
            endTimezone: trans.endTimezone || undefined,
            transportationType: trans.type as TimelineItem['transportationType'],
            vehicleNumber: trans.vehicleNumber || undefined,
            confirmationNumber: trans.confirmationNumber || undefined,
            durationMinutes,
            distanceKm: trans.calculatedDistance || undefined,
            fromCoords:
              trans.fromLocation?.latitude && trans.fromLocation?.longitude
                ? {
                    latitude: Number(trans.fromLocation.latitude),
                    longitude: Number(trans.fromLocation.longitude),
                  }
                : undefined,
            toCoords:
              trans.toLocation?.latitude && trans.toLocation?.longitude
                ? {
                    latitude: Number(trans.toLocation.latitude),
                    longitude: Number(trans.toLocation.longitude),
                  }
                : undefined,
            connectionGroupId: trans.connectionGroupId || undefined,
            data: trans,
          });
        }
        });
        logger.log(`✅ Processed transportation, total items now: ${items.length}`, { operation: 'loadTimelineData.transportation.complete' });
      } else {
        logger.log('⚠️ Transportation is not an array', {
          operation: 'loadTimelineData.transportation.invalid',
          data: { type: typeof transportation, value: transportation }
        });
      }

      // Add lodging - create an entry for each day
      logger.log('Processing lodging array', {
        operation: 'loadTimelineData.lodging',
        data: { count: lodging?.length, isArray: Array.isArray(lodging) }
      });
      if (Array.isArray(lodging)) {
        lodging.forEach((lodge, index) => {
          if (!lodge) {
            logger.log(`⚠️ Skipping null/undefined lodging at index ${index}`, { operation: 'loadTimelineData.lodging' });
            return;
          }
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

          const checkInDateOnly = new Date(checkInYear, checkInMonth - 1, checkInDay);
          const checkOutDateOnly = new Date(checkOutYear, checkOutMonth - 1, checkOutDay);

          const checkIn = new Date(lodge.checkInDate);
          const checkOut = new Date(lodge.checkOutDate);

          const totalNights = Math.round(
            (checkOutDateOnly.getTime() - checkInDateOnly.getTime()) / (1000 * 60 * 60 * 24)
          );

          const currentDate = new Date(checkInDateOnly);
          let nightNumber = 1;

          while (currentDate <= checkOutDateOnly) {
            const isCheckInDay = currentDate.getTime() === checkInDateOnly.getTime();
            const isCheckOutDay = currentDate.getTime() === checkOutDateOnly.getTime();

            let itemDateTime: Date;
            if (isCheckInDay) {
              itemDateTime = new Date(checkIn);
            } else if (isCheckOutDay) {
              itemDateTime = new Date(checkOut);
            } else {
              itemDateTime = new Date(currentDate);
              itemDateTime.setHours(12, 0, 0, 0);
            }

            let subtitle =
              lodge.type.charAt(0).toUpperCase() + lodge.type.slice(1).replace(/_/g, ' ');

            if (isCheckInDay) {
              subtitle += ' (Check-in)';
            } else if (isCheckOutDay) {
              subtitle += ' (Check-out)';
            }

            const multiDayInfo =
              totalNights > 1 && !isCheckOutDay
                ? {
                    originalId: lodge.id,
                    nightNumber: nightNumber,
                    totalNights: totalNights,
                  }
                : undefined;

            items.push({
              id: lodge.id + currentDate.getTime(),
              type: 'lodging',
              dateTime: itemDateTime,
              endDateTime: isCheckOutDay ? new Date(checkOut) : undefined,
              title: lodge.name,
              subtitle: subtitle,
              description: lodge.address || undefined,
              location: lodge.location?.name,
              locationCoords:
                lodge.location?.latitude && lodge.location?.longitude
                  ? {
                      latitude: Number(lodge.location.latitude),
                      longitude: Number(lodge.location.longitude),
                    }
                  : undefined,
              cost: isCheckInDay ? lodge.cost || undefined : undefined,
              currency: isCheckInDay ? lodge.currency || undefined : undefined,
              isAllDay: !isCheckInDay && !isCheckOutDay,
              showCheckInTime: isCheckInDay,
              showCheckOutTime: isCheckOutDay,
              confirmationNumber: isCheckInDay ? lodge.confirmationNumber || undefined : undefined,
              photoAlbums: isCheckInDay
                ? lodge.photoAlbums?.map((album) => ({
                    id: album.id,
                    name: album.name,
                    _count: album._count,
                  }))
                : undefined,
              multiDayInfo,
              data: lodge,
            });

            if (!isCheckOutDay) {
              nightNumber++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
        } else if (lodge.checkInDate) {
          items.push({
            id: lodge.id,
            type: 'lodging',
            dateTime: new Date(lodge.checkInDate),
            endDateTime: lodge.checkOutDate ? new Date(lodge.checkOutDate) : undefined,
            title: lodge.name,
            subtitle: lodge.type.charAt(0).toUpperCase() + lodge.type.slice(1).replace(/_/g, ' '),
            description: lodge.address || undefined,
            location: lodge.location?.name,
            locationCoords:
              lodge.location?.latitude && lodge.location?.longitude
                ? {
                    latitude: Number(lodge.location.latitude),
                    longitude: Number(lodge.location.longitude),
                  }
                : undefined,
            cost: lodge.cost || undefined,
            currency: lodge.currency || undefined,
            confirmationNumber: lodge.confirmationNumber || undefined,
            photoAlbums: lodge.photoAlbums?.map((album) => ({
              id: album.id,
              name: album.name,
              _count: album._count,
            })),
            data: lodge,
          });
        }
        });
        logger.log(`✅ Processed lodging, total items now: ${items.length}`, { operation: 'loadTimelineData.lodging.complete' });
      } else {
        logger.log('⚠️ Lodging is not an array', {
          operation: 'loadTimelineData.lodging.invalid',
          data: { type: typeof lodging, value: lodging }
        });
      }

      // Add journal entries (only standalone ones)
      logger.log('Processing journal array', {
        operation: 'loadTimelineData.journal',
        data: { count: journal?.length, isArray: Array.isArray(journal) }
      });
      if (Array.isArray(journal)) {
        journal.forEach((entry, index) => {
          if (!entry) {
            logger.log(`⚠️ Skipping null/undefined journal entry at index ${index}`, { operation: 'loadTimelineData.journal' });
            return;
          }
          if (entry && entry.date) {
            logger.log(`Processing journal entry ${index}`, {
              operation: 'loadTimelineData.journal.item',
              data: {
                hasActivityAssignments: 'activityAssignments' in entry,
                activityAssignmentsIsArray: Array.isArray(entry.activityAssignments),
                activityAssignmentsLength: Array.isArray(entry.activityAssignments) ? entry.activityAssignments.length : 'N/A',
                hasLodgingAssignments: 'lodgingAssignments' in entry,
                lodgingAssignmentsIsArray: Array.isArray(entry.lodgingAssignments),
                hasTransportationAssignments: 'transportationAssignments' in entry,
                transportationAssignmentsIsArray: Array.isArray(entry.transportationAssignments),
              }
            });
            const hasActivityLinks = Array.isArray(entry.activityAssignments) && entry.activityAssignments.length > 0;
            const hasLodgingLinks = Array.isArray(entry.lodgingAssignments) && entry.lodgingAssignments.length > 0;
            const hasTransportationLinks = Array.isArray(entry.transportationAssignments) && entry.transportationAssignments.length > 0;

            if (!hasActivityLinks && !hasLodgingLinks && !hasTransportationLinks) {
              const content = (entry.content != null && typeof entry.content === 'string') ? entry.content : '';
              items.push({
                id: entry.id,
                type: 'journal',
                dateTime: new Date(entry.date),
                title: entry.title || 'Untitled Entry',
                description:
                  content.substring(0, 150) + (content.length > 150 ? '...' : ''),
                location: entry.locationAssignments?.[0]?.location?.name,
                data: entry,
              });
            }
          }
        });
        logger.log(`✅ Processed journal, total items now: ${items.length}`, { operation: 'loadTimelineData.journal.complete' });
      } else {
        logger.log('⚠️ Journal is not an array', {
          operation: 'loadTimelineData.journal.invalid',
          data: { type: typeof journal, value: journal }
        });
      }

      // Sort by date/time
      logger.log(`Sorting ${items.length} timeline items`, { operation: 'loadTimelineData.sort' });
      try {
        items.sort((a, b) => {
          if (!a || !a.dateTime) {
            logger.log('⚠️ Found item without dateTime in sort (a)', { operation: 'loadTimelineData.sort', data: { item: a } });
            return 1;
          }
          if (!b || !b.dateTime) {
            logger.log('⚠️ Found item without dateTime in sort (b)', { operation: 'loadTimelineData.sort', data: { item: b } });
            return -1;
          }
          return a.dateTime.getTime() - b.dateTime.getTime();
        });
        logger.log('✅ Sorting complete', { operation: 'loadTimelineData.sort.complete' });
      } catch (sortError) {
        logger.error('❌ Error during sort', sortError, { operation: 'loadTimelineData.sort' });
        throw sortError;
      }

      logger.log(`Setting timeline items state with ${items.length} items`, { operation: 'loadTimelineData.setState' });
      setTimelineItems(items);

      // Process weather data
      logger.log('Processing weather data', {
        operation: 'loadTimelineData.weather',
        data: { count: weather?.length, isArray: Array.isArray(weather) }
      });
      const weatherByDate: Record<string, WeatherData> = {};
      if (Array.isArray(weather)) {
        weather.forEach((w, index) => {
          if (!w) {
            logger.log(`⚠️ Skipping null/undefined weather at index ${index}`, { operation: 'loadTimelineData.weather' });
            return;
          }
          if (w && w.date) {
            const dateKey = getDateStringInTimezone(new Date(w.date), tripTimezone);
            weatherByDate[dateKey] = w;
          }
        });
        logger.log(`✅ Processed ${Object.keys(weatherByDate).length} weather entries`, { operation: 'loadTimelineData.weather.complete' });
      } else {
        logger.log('⚠️ Weather is not an array', {
          operation: 'loadTimelineData.weather.invalid',
          data: { type: typeof weather, value: weather }
        });
      }

      logger.log('Setting weather data state', { operation: 'loadTimelineData.setWeatherState', data: { count: Object.keys(weatherByDate).length } });
      setWeatherData(weatherByDate);

      logger.log('✅ loadTimelineData completed successfully', {
        operation: 'loadTimelineData.complete',
        data: { itemsCount: items.length, weatherCount: Object.keys(weatherByDate).length }
      });
    } catch (error) {
      logger.error('❌ Error in loadTimelineData', error, {
        operation: 'loadTimelineData.error',
        data: { tripId, errorMessage: error instanceof Error ? error.message : String(error) }
      });
      toast.error('Failed to load timeline data');
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
      logger.log('Loading state set to false', { operation: 'loadTimelineData.finally' });
    }
  };

  // Filter items by visible types
  const filteredItems = useMemo(() => {
    logger.log('useMemo: filteredItems calculation started', {
      operation: 'useMemo.filteredItems',
      data: {
        timelineItemsCount: timelineItems?.length ?? 'null/undefined',
        timelineItemsIsArray: Array.isArray(timelineItems),
        visibleTypesSize: visibleTypes?.size ?? 'null/undefined'
      }
    });

    try {
      if (!Array.isArray(timelineItems)) {
        logger.log('⚠️ timelineItems is not an array in filteredItems', {
          operation: 'useMemo.filteredItems',
          data: { type: typeof timelineItems, value: timelineItems }
        });
        return [];
      }

      const filtered = timelineItems.filter((item, index) => {
        if (!item) {
          logger.log(`⚠️ Null/undefined item at index ${index} in filteredItems`, { operation: 'useMemo.filteredItems' });
          return false;
        }

        if (visibleTypes.has(item.type)) {
          return true;
        }
        if (visibleTypes.has('journal')) {
          if (
            'journalAssignments' in item.data &&
            item.data.journalAssignments &&
            Array.isArray(item.data.journalAssignments) &&
            item.data.journalAssignments.length > 0
          ) {
            return true;
          }
        }
        return false;
      });

      logger.log(`useMemo: filteredItems complete`, {
        operation: 'useMemo.filteredItems.complete',
        data: { filteredCount: filtered.length, originalCount: timelineItems.length }
      });

      return filtered;
    } catch (error) {
      logger.error('❌ Error in filteredItems useMemo', error, { operation: 'useMemo.filteredItems.error' });
      return [];
    }
  }, [timelineItems, visibleTypes, logger]);

  // Generate all dates from trip start to end
  const generateAllTripDates = (): string[] => {
    if (!tripStartDate || !tripEndDate || !tripTimezone) return [];

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

    const dates: string[] = [];
    const current = new Date(startParts.year, startParts.month, startParts.day, 12, 0, 0);
    const endDate = new Date(endParts.year, endParts.month, endParts.day, 12, 0, 0);

    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    while (current <= endDate) {
      dates.push(formatter.format(current));
      current.setDate(current.getDate() + 1);
      if (dates.length > 1000) break;
    }

    return dates;
  };

  const allTripDates = generateAllTripDates();

  // Group items by date
  const groupedItems = useMemo(() => {
    logger.log('useMemo: groupedItems calculation started', {
      operation: 'useMemo.groupedItems',
      data: {
        filteredItemsCount: filteredItems?.length ?? 'null/undefined',
        filteredItemsIsArray: Array.isArray(filteredItems),
        tripTimezone
      }
    });

    try {
      if (!Array.isArray(filteredItems)) {
        logger.log('⚠️ filteredItems is not an array in groupedItems', {
          operation: 'useMemo.groupedItems',
          data: { type: typeof filteredItems, value: filteredItems }
        });
        return {};
      }

      const grouped = filteredItems.reduce((acc, item, index) => {
        if (!item) {
          logger.log(`⚠️ Null/undefined item at index ${index} in groupedItems`, { operation: 'useMemo.groupedItems' });
          return acc;
        }

        if (!item.dateTime) {
          logger.log(`⚠️ Item at index ${index} has no dateTime`, {
            operation: 'useMemo.groupedItems',
            data: { item }
          });
          return acc;
        }

        try {
          const itemTimezone =
            item.type === 'transportation' && item.startTimezone ? item.startTimezone : tripTimezone;

          const dateKey = getDateStringInTimezone(item.dateTime, itemTimezone);
          if (!acc[dateKey]) {
            acc[dateKey] = [];
          }
          acc[dateKey].push(item);
        } catch (itemError) {
          logger.error(`❌ Error processing item at index ${index}`, itemError, {
            operation: 'useMemo.groupedItems.item',
            data: { item, index }
          });
        }

        return acc;
      }, {} as Record<string, TimelineItem[]>);

      logger.log('useMemo: groupedItems complete', {
        operation: 'useMemo.groupedItems.complete',
        data: { groupCount: Object.keys(grouped).length, itemsProcessed: filteredItems.length }
      });

      return grouped;
    } catch (error) {
      logger.error('❌ Error in groupedItems useMemo', error, { operation: 'useMemo.groupedItems.error' });
      return {};
    }
  }, [filteredItems, tripTimezone, logger]);

  // Merge all trip dates with grouped items
  const allGroupedItems: Record<string, TimelineItem[]> = useMemo(() => {
    logger.log('useMemo: allGroupedItems calculation started', {
      operation: 'useMemo.allGroupedItems',
      data: {
        allTripDatesCount: allTripDates?.length ?? 'null/undefined',
        allTripDatesIsArray: Array.isArray(allTripDates),
        groupedItemsKeys: Object.keys(groupedItems || {}).length
      }
    });

    try {
      const result: Record<string, TimelineItem[]> = {};

      if (allTripDates && Array.isArray(allTripDates) && allTripDates.length > 0) {
        allTripDates.forEach((dateKey, index) => {
          if (!dateKey) {
            logger.log(`⚠️ Null/undefined dateKey at index ${index} in allTripDates`, { operation: 'useMemo.allGroupedItems' });
            return;
          }
          result[dateKey] = groupedItems[dateKey] || [];
        });
        Object.keys(groupedItems).forEach((dateKey) => {
          if (!result[dateKey]) {
            result[dateKey] = groupedItems[dateKey];
          }
        });
      } else {
        Object.assign(result, groupedItems);
      }

      logger.log('useMemo: allGroupedItems complete', {
        operation: 'useMemo.allGroupedItems.complete',
        data: { resultKeys: Object.keys(result).length }
      });

      return result;
    } catch (error) {
      logger.error('❌ Error in allGroupedItems useMemo', error, { operation: 'useMemo.allGroupedItems.error' });
      return {};
    }
  }, [allTripDates, groupedItems, logger]);

  // Sort dates chronologically
  const sortedDateKeys = useMemo(() => {
    logger.log('useMemo: sortedDateKeys calculation started', {
      operation: 'useMemo.sortedDateKeys',
      data: {
        allGroupedItemsKeys: allGroupedItems ? Object.keys(allGroupedItems).length : 'null/undefined'
      }
    });

    try {
      if (!allGroupedItems) {
        logger.log('⚠️ allGroupedItems is null/undefined', { operation: 'useMemo.sortedDateKeys' });
        return [];
      }

      const keys = Object.keys(allGroupedItems);
      const sorted = keys.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      logger.log('useMemo: sortedDateKeys complete', {
        operation: 'useMemo.sortedDateKeys.complete',
        data: { keysCount: sorted.length }
      });

      return sorted;
    } catch (error) {
      logger.error('❌ Error in sortedDateKeys useMemo', error, { operation: 'useMemo.sortedDateKeys.error' });
      return [];
    }
  }, [allGroupedItems, logger]);

  // Get day number from trip start date
  const getDayNumber = (dateString: string): number | null => {
    if (!tripStartDate) return null;

    const match = tripStartDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    let startDate: Date;
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      startDate = new Date(year, month, day, 0, 0, 0, 0);
    } else {
      startDate = new Date(tripStartDate);
      startDate.setHours(0, 0, 0, 0);
    }

    const itemDate = new Date(dateString);
    itemDate.setHours(0, 0, 0, 0);

    const diffTime = itemDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  // Transform weather data
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
      locationName: weather.locationName,
    };
  };

  // Calculate stats for a day
  const calculateDayStats = (items: TimelineItem[]): DayStats => {
    const stats: DayStats = {
      activities: 0,
      transportation: 0,
      lodging: 0,
      journal: 0,
      totalPhotosLinked: 0,
    };

    items.forEach((item) => {
      switch (item.type) {
        case 'activity':
          stats.activities++;
          break;
        case 'transportation':
          stats.transportation++;
          break;
        case 'lodging':
          stats.lodging++;
          break;
        case 'journal':
          stats.journal++;
          break;
      }

      // Count linked photos from summary
      if (summaryMap) {
        const entityType =
          item.type === 'activity'
            ? 'ACTIVITY'
            : item.type === 'transportation'
            ? 'TRANSPORTATION'
            : item.type === 'lodging'
            ? 'LODGING'
            : 'JOURNAL_ENTRY';
        const key = `${entityType}:${item.data.id}`;
        const summary = summaryMap[key];
        if (summary?.linkCounts.PHOTO) {
          stats.totalPhotosLinked += summary.linkCounts.PHOTO;
        }
      }
    });

    return stats;
  };

  // Build day groups
  const dayGroups: DayGroup[] = useMemo(() => {
    logger.log('useMemo: dayGroups calculation started', {
      operation: 'useMemo.dayGroups',
      data: {
        sortedDateKeysCount: sortedDateKeys?.length ?? 'null/undefined',
        sortedDateKeysIsArray: Array.isArray(sortedDateKeys),
        allGroupedItemsKeys: allGroupedItems ? Object.keys(allGroupedItems).length : 'null/undefined',
        weatherDataKeys: weatherData ? Object.keys(weatherData).length : 'null/undefined',
      }
    });

    try {
      if (!sortedDateKeys || !Array.isArray(sortedDateKeys)) {
        logger.log('⚠️ sortedDateKeys is not valid', {
          operation: 'useMemo.dayGroups',
          data: { sortedDateKeys, isArray: Array.isArray(sortedDateKeys) }
        });
        return [];
      }

      const groups = sortedDateKeys.map((dateKey, index) => {
        try {
          if (!dateKey) {
            logger.log(`⚠️ Null/undefined dateKey at index ${index}`, { operation: 'useMemo.dayGroups.map' });
            return null;
          }

          const items = allGroupedItems[dateKey] || [];
          const dayWeather = weatherData[dateKey];

          if (!Array.isArray(items)) {
            logger.log(`⚠️ Items for dateKey ${dateKey} is not an array`, {
              operation: 'useMemo.dayGroups.map',
              data: { dateKey, itemsType: typeof items, items }
            });
          }

          const group = {
            dateKey,
            dayNumber: getDayNumber(dateKey),
            items,
            weather: dayWeather ? transformWeatherData(dayWeather) : undefined,
            stats: calculateDayStats(items),
          };

          return group;
        } catch (itemError) {
          logger.error(`❌ Error processing dateKey ${dateKey} at index ${index}`, itemError, {
            operation: 'useMemo.dayGroups.map.item',
            data: { dateKey, index }
          });
          return null;
        }
      }).filter(group => group !== null) as DayGroup[];

      logger.log('useMemo: dayGroups complete', {
        operation: 'useMemo.dayGroups.complete',
        data: { groupsCount: groups.length, dateKeysProcessed: sortedDateKeys.length }
      });

      return groups;
    } catch (error) {
      logger.error('❌ Error in dayGroups useMemo', error, { operation: 'useMemo.dayGroups.error' });
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedDateKeys, allGroupedItems, weatherData, summaryMap, tripStartDate, logger]);

  // Weather refresh handler
  const handleRefreshWeather = async () => {
    setRefreshingWeather(true);
    try {
      const weather = await weatherService.refreshAllWeather(tripId);

      const weatherByDate: Record<string, WeatherData> = {};
      if (weather && Array.isArray(weather)) {
        weather.forEach((w) => {
          const dateKey = getDateStringInTimezone(new Date(w.date), tripTimezone);
          weatherByDate[dateKey] = w;
        });
      }
      setWeatherData(weatherByDate);

      toast.success(`Weather data refreshed successfully (${weather?.length || 0} days)`);
    } catch (error) {
      console.error('Error refreshing weather:', error);
      toast.error('Failed to refresh weather data');
    } finally {
      setRefreshingWeather(false);
    }
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-900 dark:text-white">Loading timeline...</div>
    );
  }

  if (timelineItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No timeline items yet. Add activities, transportation, lodging, or journal entries to see
        them here.
      </div>
    );
  }

  return (
    <div className="timeline-container">
      {/* Print Styles */}
      <style>{`
        @media print {
          .timeline-controls,
          .timeline-filter-bar,
          .timeline-timezone-tabs,
          nav,
          header,
          footer,
          button,
          .no-print {
            display: none !important;
          }

          .timeline-container {
            padding: 0 !important;
            margin: 0 !important;
          }

          .timeline-content {
            display: block !important;
          }

          .timeline-day {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 1rem !important;
          }

          .timeline-item {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          *,
          *::before,
          *::after,
          body,
          html {
            color: #000 !important;
            background-color: #fff !important;
            background: #fff !important;
            border-color: #d1d5db !important;
          }

          .text-gray-900,
          .text-gray-800,
          .text-gray-700,
          .text-gray-600,
          .text-gray-500,
          .dark\\:text-white,
          .dark\\:text-gray-100,
          .dark\\:text-gray-200,
          .dark\\:text-gray-300,
          .dark\\:text-gray-400 {
            color: #1f2937 !important;
          }

          .bg-green-500,
          .bg-blue-500,
          .bg-purple-500,
          .bg-amber-500 {
            background-color: initial !important;
            color: #1f2937 !important;
            border: 1px solid #d1d5db !important;
          }
        }
      `}</style>

      {/* Filter Bar */}
      <div className="timeline-filter-bar mb-6 print:hidden">
        <TimelineFilters
          visibleTypes={visibleTypes}
          onToggleType={toggleType}
          viewMode={viewMode}
          onToggleViewMode={toggleViewMode}
          onExpandAll={expandAllDays}
          onCollapseAll={collapseAllDays}
        />

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          {/* Weather Refresh */}
          <button
            type="button"
            onClick={handleRefreshWeather}
            disabled={refreshingWeather}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh weather data"
          >
            <svg
              className={`w-4 h-4 ${refreshingWeather ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden sm:inline">
              {refreshingWeather ? 'Refreshing...' : 'Refresh Weather'}
            </span>
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5"
            title="Print timeline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Mobile timezone toggle */}
      {showDualTimezone && (
        <div className="lg:hidden mb-4 print:hidden">
          <MobileTimezoneToggle
            activeTimezone={mobileActiveTimezone}
            tripTimezone={tripTimezone}
            userTimezone={userTimezone}
            onToggle={setMobileActiveTimezone}
          />
        </div>
      )}

      {/* Timeline Content */}
      <div className="timeline-content space-y-4">
        {dayGroups.map((dayGroup) => (
          <TimelineDaySection
            key={dayGroup.dateKey}
            dayGroup={dayGroup}
            tripId={tripId}
            tripTimezone={tripTimezone}
            userTimezone={userTimezone}
            viewMode={viewMode}
            isCollapsed={collapsedDays.has(dayGroup.dateKey)}
            showDualTimezone={!!showDualTimezone}
            linkSummaryMap={summaryMap}
            onToggleCollapse={() => toggleDay(dayGroup.dateKey)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onLinkUpdate={handleLinkUpdate}
          />
        ))}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <TimelineEditModal
          isOpen={editModalOpen}
          onClose={handleEditClose}
          onSave={handleEditSave}
          itemType={editingItem.type}
          itemData={editingItem.data}
          tripId={tripId}
          locations={locations}
          tripTimezone={tripTimezone}
          activities={allActivities}
          lodgings={allLodgings}
          transportations={allTransportations}
        />
      )}
    </div>
  );
};

export default Timeline;
