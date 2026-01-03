import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { Activity } from "../types/activity";
import type { Transportation } from "../types/transportation";
import type { Lodging } from "../types/lodging";
import type { JournalEntry } from "../types/journalEntry";
import type { Location } from "../types/location";
import type { WeatherData, WeatherDisplay } from "../types/weather";
import activityService from "../services/activity.service";
import transportationService from "../services/transportation.service";
import lodgingService from "../services/lodging.service";
import journalService from "../services/journalEntry.service";
import weatherService from "../services/weather.service";
import locationService from "../services/location.service";
import WeatherCard from "./WeatherCard";
import DayMiniMap from "./DayMiniMap";
import TimelineEditModal from "./TimelineEditModal";
import { getWeatherIcon } from "../utils/weatherIcons";
import toast from "react-hot-toast";

interface TimelineProps {
  tripId: number;
  tripTimezone?: string;
  userTimezone?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  tripStatus?: string;
  onNavigateToTab?: (
    tab: "activities" | "transportation" | "lodging" | "journal",
    itemId?: number
  ) => void;
  onRefresh?: () => void;
}

type TimelineItemType = "activity" | "transportation" | "lodging" | "journal";
type TransportationType =
  | "flight"
  | "train"
  | "bus"
  | "car"
  | "ferry"
  | "bicycle"
  | "walk"
  | "other";

interface PhotoAlbumInfo {
  id: number;
  name: string;
  _count?: {
    photoAssignments: number;
  };
}

interface TimelineItem {
  id: number;
  type: TimelineItemType;
  dateTime: Date;
  endDateTime?: Date;
  title: string;
  subtitle?: string;
  description?: string;
  location?: string;
  locationCoords?: { latitude: number; longitude: number }; // For mini-map
  cost?: number;
  currency?: string;
  isAllDay?: boolean; // Flag for multi-day lodging entries
  showCheckInTime?: boolean; // Show check-in time
  showCheckOutTime?: boolean; // Show check-out time
  startTimezone?: string; // Timezone for departure/start time (for transportation)
  endTimezone?: string; // Timezone for arrival/end time (for transportation)
  transportationType?: TransportationType; // Specific type of transportation for icon
  vehicleNumber?: string; // Flight number, train number, etc.
  confirmationNumber?: string; // Booking confirmation code
  durationMinutes?: number; // Duration in minutes
  distanceKm?: number; // Distance in kilometers
  photoAlbums?: PhotoAlbumInfo[]; // Associated photo albums
  fromCoords?: { latitude: number; longitude: number }; // For transportation departure
  toCoords?: { latitude: number; longitude: number }; // For transportation arrival
  connectionGroupId?: string; // For multi-leg transport connections
  multiDayInfo?: {
    originalId: number; // Original lodging ID
    nightNumber: number; // Which night of the stay (1, 2, 3...)
    totalNights: number; // Total nights
  };
  data: Activity | Transportation | Lodging | JournalEntry;
}

const Timeline = ({
  tripId,
  tripTimezone,
  userTimezone,
  tripStartDate,
  tripEndDate,
  tripStatus,
  onNavigateToTab,
  onRefresh,
}: TimelineProps) => {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [weatherData, setWeatherData] = useState<Record<string, WeatherData>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [mobileActiveTimezone, setMobileActiveTimezone] = useState<
    "trip" | "user"
  >("trip");
  const [visibleTypes, setVisibleTypes] = useState<Set<TimelineItemType>>(
    new Set(["activity", "transportation", "lodging", "journal"])
  );
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [allLodgings, setAllLodgings] = useState<Lodging[]>([]);
  const [allTransportations, setAllTransportations] = useState<
    Transportation[]
  >([]);

  // Check if we should show dual timezones
  const showDualTimezone =
    tripTimezone && userTimezone && tripTimezone !== userTimezone;

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

  // Handle edit - open modal instead of navigating to tab
  const handleEdit = async (item: TimelineItem) => {
    // Load locations if not already loaded
    if (locations.length === 0) {
      try {
        const locs = await locationService.getLocationsByTrip(tripId);
        setLocations(locs);
      } catch (error) {
        console.error("Failed to load locations:", error);
      }
    }

    // For journal entries, load all entities for linking
    if (item.type === "journal") {
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
        console.error("Failed to load trip entities:", error);
      }
    }

    setEditingItem(item);
    setEditModalOpen(true);
  };

  // Handle modal save - refresh timeline data
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
    // Get the actual ID from the original data
    const itemId = item.data.id;

    // Confirm before deleting
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      return;
    }

    try {
      switch (item.type) {
        case "activity":
          await activityService.deleteActivity(itemId);
          break;
        case "transportation":
          await transportationService.deleteTransportation(itemId);
          break;
        case "lodging":
          await lodgingService.deleteLodging(itemId);
          break;
        case "journal":
          await journalService.deleteJournalEntry(itemId);
          break;
      }

      toast.success(
        `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} deleted`
      );

      // Refresh timeline
      loadTimelineData();
      onRefresh?.();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error(`Failed to delete ${item.type}`);
    }
  };

  // Helper function to get date string in a specific timezone
  // Returns a string like "Mon Nov 22 2024" but in the specified timezone
  const getDateStringInTimezone = (date: Date, timezone?: string): string => {
    if (!timezone) {
      return date.toDateString();
    }

    try {
      // Format the date in the specified timezone to get year, month, day
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      return formatter.format(date);
    } catch (error) {
      console.warn(`Invalid timezone: ${timezone}`, error);
      return date.toDateString();
    }
  };

  useEffect(() => {
    loadTimelineData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const loadTimelineData = async () => {
    setLoading(true);
    try {
      const [activities, transportation, lodging, journal, weather] =
        await Promise.all([
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
          // Calculate duration if both start and end times exist
          let durationMinutes: number | undefined;
          if (activity.startTime && activity.endTime) {
            const start = new Date(activity.startTime);
            const end = new Date(activity.endTime);
            durationMinutes = Math.round(
              (end.getTime() - start.getTime()) / (1000 * 60)
            );
          }

          items.push({
            id: activity.id,
            type: "activity",
            dateTime: new Date(activity.startTime),
            endDateTime: activity.endTime
              ? new Date(activity.endTime)
              : undefined,
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

      // Add transportation
      transportation.forEach((trans) => {
        if (trans.departureTime) {
          // DEBUG: Log transportation data to see what we're getting
          console.log('[Timeline Debug] Transportation entry:', {
            id: trans.id,
            type: trans.type,
            fromLocationId: trans.fromLocationId,
            fromLocation: trans.fromLocation,
            fromLocationName: trans.fromLocationName,
            toLocationId: trans.toLocationId,
            toLocation: trans.toLocation,
            toLocationName: trans.toLocationName,
          });

          // Helper to get location display name with fallback
          const getLocationDisplay = (
            location: typeof trans.fromLocation,
            locationId: number | null,
            locationName: string | null
          ): string => {
            if (location?.name) return location.name;
            if (locationName) return locationName;
            if (locationId) return `Location #${locationId} (deleted?)`;
            return "Unknown";
          };

          // Calculate duration from times if not provided
          let durationMinutes = trans.durationMinutes || undefined;
          if (!durationMinutes && trans.departureTime && trans.arrivalTime) {
            const start = new Date(trans.departureTime);
            const end = new Date(trans.arrivalTime);
            durationMinutes = Math.round(
              (end.getTime() - start.getTime()) / (1000 * 60)
            );
          }

          items.push({
            id: trans.id,
            type: "transportation",
            dateTime: new Date(trans.departureTime),
            endDateTime: trans.arrivalTime
              ? new Date(trans.arrivalTime)
              : undefined,
            title: `${
              trans.type.charAt(0).toUpperCase() + trans.type.slice(1)
            }`,
            subtitle: trans.carrier || undefined,
            description: `${getLocationDisplay(
              trans.fromLocation,
              trans.fromLocationId,
              trans.fromLocationName
            )} → ${getLocationDisplay(
              trans.toLocation,
              trans.toLocationId,
              trans.toLocationName
            )}`,
            cost: trans.cost || undefined,
            currency: trans.currency || undefined,
            startTimezone: trans.startTimezone || undefined,
            endTimezone: trans.endTimezone || undefined,
            transportationType: trans.type as TransportationType,
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

      // Add lodging - create an entry for each day from check-in to check-out
      lodging.forEach((lodge) => {
        if (lodge.checkInDate && lodge.checkOutDate) {
          // Parse date portions directly to avoid timezone shifts
          // Date strings from backend are in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
          const checkInStr = lodge.checkInDate.split('T')[0];
          const checkOutStr = lodge.checkOutDate.split('T')[0];

          const [checkInYear, checkInMonth, checkInDay] = checkInStr.split('-').map(Number);
          const [checkOutYear, checkOutMonth, checkOutDay] = checkOutStr.split('-').map(Number);

          // Create local dates at midnight for day comparison (used for loop iteration)
          const checkInDateOnly = new Date(checkInYear, checkInMonth - 1, checkInDay);
          const checkOutDateOnly = new Date(checkOutYear, checkOutMonth - 1, checkOutDay);

          // Keep original Date objects for time display
          const checkIn = new Date(lodge.checkInDate);
          const checkOut = new Date(lodge.checkOutDate);

          // Calculate total nights (check-out day minus check-in day)
          const totalNights = Math.round(
            (checkOutDateOnly.getTime() - checkInDateOnly.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Create an entry for each day of the stay
          const currentDate = new Date(checkInDateOnly);
          let nightNumber = 1;

          while (currentDate <= checkOutDateOnly) {
            const isCheckInDay =
              currentDate.getTime() === checkInDateOnly.getTime();
            const isCheckOutDay =
              currentDate.getTime() === checkOutDateOnly.getTime();

            // Set the time to check-in time on first day, check-out time on last day
            // For intermediate days, use noon to avoid timezone edge cases where
            // midnight could shift to the previous day when converting timezones
            let itemDateTime: Date;
            if (isCheckInDay) {
              itemDateTime = new Date(checkIn);
            } else if (isCheckOutDay) {
              itemDateTime = new Date(checkOut);
            } else {
              // Intermediate days: use noon to stay safely within the calendar date
              itemDateTime = new Date(currentDate);
              itemDateTime.setHours(12, 0, 0, 0);
            }

            // DEBUG: Log the datetime being created for each lodging entry
            console.log(`[Lodging Debug] ${lodge.name}:`, {
              isCheckInDay,
              isCheckOutDay,
              currentDate: currentDate.toISOString(),
              itemDateTime: itemDateTime.toISOString(),
              nightNumber,
              totalNights,
            });

            let subtitle =
              lodge.type.charAt(0).toUpperCase() +
              lodge.type.slice(1).replace(/_/g, " ");

            if (isCheckInDay) {
              subtitle += " (Check-in)";
            } else if (isCheckOutDay) {
              subtitle += " (Check-out)";
            }

            // Only add multiDayInfo for stays longer than 1 night
            const multiDayInfo = totalNights > 1 && !isCheckOutDay
              ? {
                  originalId: lodge.id,
                  nightNumber: nightNumber,
                  totalNights: totalNights,
                }
              : undefined;

            items.push({
              id: lodge.id + currentDate.getTime(), // Unique ID for each day
              type: "lodging",
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
              cost: isCheckInDay ? lodge.cost || undefined : undefined, // Only show cost on check-in day
              currency: isCheckInDay ? lodge.currency || undefined : undefined,
              isAllDay: !isCheckInDay && !isCheckOutDay, // Middle days are all-day
              showCheckInTime: isCheckInDay,
              showCheckOutTime: isCheckOutDay,
              confirmationNumber: isCheckInDay
                ? lodge.confirmationNumber || undefined
                : undefined,
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

            // Move to next day and increment night number (but not on checkout day)
            if (!isCheckOutDay) {
              nightNumber++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
        } else if (lodge.checkInDate) {
          // Fallback for lodging without check-out date
          items.push({
            id: lodge.id,
            type: "lodging",
            dateTime: new Date(lodge.checkInDate),
            endDateTime: lodge.checkOutDate
              ? new Date(lodge.checkOutDate)
              : undefined,
            title: lodge.name,
            subtitle:
              lodge.type.charAt(0).toUpperCase() +
              lodge.type.slice(1).replace(/_/g, " "),
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

      // Add journal entries (only if they're NOT associated with other entities)
      journal.forEach((entry) => {
        if (entry.date) {
          // Check if this journal entry is linked to any activities, lodging, or transportation
          const hasActivityLinks = (entry.activityAssignments?.length || 0) > 0;
          const hasLodgingLinks = (entry.lodgingAssignments?.length || 0) > 0;
          const hasTransportationLinks =
            (entry.transportationAssignments?.length || 0) > 0;

          // Only add to timeline if it's a standalone journal entry
          if (
            !hasActivityLinks &&
            !hasLodgingLinks &&
            !hasTransportationLinks
          ) {
            items.push({
              id: entry.id,
              type: "journal",
              dateTime: new Date(entry.date),
              title: entry.title || "Untitled Entry",
              description:
                entry.content.substring(0, 150) +
                (entry.content.length > 150 ? "..." : ""),
              location: entry.locationAssignments?.[0]?.location?.name,
              data: entry,
            });
          }
        }
      });

      // Sort by date/time
      items.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

      setTimelineItems(items);

      // Process weather data into a map by date (using trip timezone)
      const weatherByDate: Record<string, WeatherData> = {};
      weather.forEach((w) => {
        const dateKey = getDateStringInTimezone(new Date(w.date), tripTimezone);
        weatherByDate[dateKey] = w;
      });

      setWeatherData(weatherByDate);
    } catch (error) {
      toast.error("Failed to load timeline data");
      console.error("Error loading timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group items by day
  // Filter items by visible types
  const filteredItems = timelineItems.filter((item) =>
    visibleTypes.has(item.type)
  );

  // Generate all dates from trip start to end (if available) in trip timezone
  const generateAllTripDates = (): string[] => {
    if (!tripStartDate || !tripEndDate || !tripTimezone) return [];

    // Parse date-only strings (YYYY-MM-DD) to extract year, month, day
    // tripStartDate and tripEndDate are date-only strings like "2025-11-22"
    // These represent calendar dates in the TRIP timezone, not UTC.
    const parseLocalDate = (
      dateStr: string
    ): { year: number; month: number; day: number } => {
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return {
          year: parseInt(match[1], 10),
          month: parseInt(match[2], 10) - 1, // 0-indexed
          day: parseInt(match[3], 10),
        };
      }
      const d = new Date(dateStr);
      return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
    };

    const startParts = parseLocalDate(tripStartDate);
    const endParts = parseLocalDate(tripEndDate);

    // Generate dates by iterating through calendar days
    // Use noon to avoid any DST edge cases
    const dates: string[] = [];
    const current = new Date(
      startParts.year,
      startParts.month,
      startParts.day,
      12,
      0,
      0
    );
    const endDate = new Date(
      endParts.year,
      endParts.month,
      endParts.day,
      12,
      0,
      0
    );

    const formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    while (current <= endDate) {
      dates.push(formatter.format(current));
      current.setDate(current.getDate() + 1);
      if (dates.length > 1000) break;
    }

    return dates;
  };

  const allTripDates = generateAllTripDates();

  const groupedItems = filteredItems.reduce((acc, item) => {
    // Determine which timezone to use for grouping:
    // - For transportation items, use startTimezone if available
    // - Otherwise, use tripTimezone
    const itemTimezone =
      item.type === "transportation" && item.startTimezone
        ? item.startTimezone
        : tripTimezone;

    const dateKey = getDateStringInTimezone(item.dateTime, itemTimezone);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, TimelineItem[]>);

  // Merge all trip dates with grouped items (empty arrays for days without items)
  const allGroupedItems: Record<string, TimelineItem[]> = {};
  if (allTripDates.length > 0) {
    // Include all trip dates
    allTripDates.forEach((dateKey) => {
      allGroupedItems[dateKey] = groupedItems[dateKey] || [];
    });
    // Also include any dates outside the trip range that have items
    Object.keys(groupedItems).forEach((dateKey) => {
      if (!allGroupedItems[dateKey]) {
        allGroupedItems[dateKey] = groupedItems[dateKey];
      }
    });
  } else {
    // No trip dates defined, just use existing grouped items
    Object.assign(allGroupedItems, groupedItems);
  }

  // Sort dates chronologically
  const sortedDateKeys = Object.keys(allGroupedItems).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const formatTime = (date: Date, displayTimezone?: string) => {
    // If a timezone is specified, format the time in that timezone
    if (displayTimezone) {
      return date.toLocaleTimeString("en-US", {
        timeZone: displayTimezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
    // Otherwise use default formatting
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getTimezoneAbbr = (timezone: string): string => {
    // Simple mapping for common timezones
    const abbrs: Record<string, string> = {
      UTC: "UTC",
      "America/New_York": "EST/EDT",
      "America/Chicago": "CST/CDT",
      "America/Denver": "MST/MDT",
      "America/Los_Angeles": "PST/PDT",
      "America/Anchorage": "AKST/AKDT",
      "Pacific/Honolulu": "HST",
      "Europe/London": "GMT/BST",
      "Europe/Paris": "CET/CEST",
      "Europe/Berlin": "CET/CEST",
      "Asia/Tokyo": "JST",
      "Asia/Shanghai": "CST",
      "Asia/Dubai": "GST",
      "Australia/Sydney": "AEST/AEDT",
      "Pacific/Auckland": "NZST/NZDT",
    };
    return abbrs[timezone] || timezone.split("/").pop() || timezone;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 0) return "";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatDistance = (kilometers: number | null | undefined): string => {
    if (kilometers == null || typeof kilometers !== 'number' || isNaN(kilometers)) {
      return 'Unknown distance';
    }
    const miles = kilometers * 0.621371;
    return `${kilometers.toFixed(1)} km (${miles.toFixed(1)} mi)`;
  };

  const getDayNumber = (dateString: string): number | null => {
    if (!tripStartDate) return null;

    // Parse tripStartDate as a local date (not UTC) to avoid timezone issues
    // ISO format dates (YYYY-MM-DD) are interpreted as UTC midnight by default
    const match = tripStartDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    let startDate: Date;
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed
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
    return diffDays + 1; // Day 1 is the first day
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayNumber = getDayNumber(dateString);
    const formattedDate = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return dayNumber && dayNumber > 0
      ? `Day ${dayNumber} - ${formattedDate}`
      : formattedDate;
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
      locationName: weather.locationName,
    };
  };

  const renderTimelineColumn = (items: TimelineItem[], timezone?: string) => {
    // Pre-compute connection groups for this day's items
    const connectionGroups = new Map<string, TimelineItem[]>();
    items.forEach((item) => {
      if (item.connectionGroupId) {
        const group = connectionGroups.get(item.connectionGroupId) || [];
        group.push(item);
        connectionGroups.set(item.connectionGroupId, group);
      }
    });

    // Helper to get connection info for an item
    const getConnectionInfo = (item: TimelineItem) => {
      if (!item.connectionGroupId) return null;
      const group = connectionGroups.get(item.connectionGroupId);
      if (!group || group.length < 2) return null;

      // Sort by departure time
      const sortedGroup = [...group].sort(
        (a, b) => a.dateTime.getTime() - b.dateTime.getTime()
      );
      const index = sortedGroup.findIndex((i) => i.id === item.id);

      return {
        legNumber: index + 1,
        totalLegs: sortedGroup.length,
        isFirst: index === 0,
        isLast: index === sortedGroup.length - 1,
        groupId: item.connectionGroupId,
      };
    };

    return (
      <div className="flex-1">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

          <div className="space-y-6">
            {items.map((item, itemIndex) => {
              const connectionInfo = getConnectionInfo(item);
              const nextItem = items[itemIndex + 1];
              const showConnectionLine =
                connectionInfo &&
                !connectionInfo.isLast &&
                nextItem?.connectionGroupId === item.connectionGroupId;

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="timeline-item relative flex gap-4"
                >
                  {/* Connection line to next item */}
                  {showConnectionLine && (
                    <div className="absolute left-6 top-12 h-full w-0.5 border-l-2 border-dashed border-green-400 dark:border-green-500 z-0 -translate-x-px"></div>
                  )}

                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full ${getTypeColor(
                      item.type
                    )} text-white flex items-center justify-center z-10 ${
                      connectionInfo
                        ? "ring-2 ring-green-400 dark:ring-green-500"
                        : ""
                    }`}
                  >
                    {getIcon(item.type, item)}
                  </div>

                  {/* Content */}
                  <div
                    className={`group flex-1 bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm relative ${
                      connectionInfo
                        ? "border-green-300 dark:border-green-600"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {/* Quick Action Buttons - appear on hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 print:hidden">
                      {onNavigateToTab && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item);
                          }}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item);
                        }}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-start justify-between mb-2 pr-16">
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          {item.isAllDay ? (
                            "All Day"
                          ) : item.showCheckInTime ? (
                            `Check-in: ${formatTime(item.dateTime, timezone)}`
                          ) : item.showCheckOutTime ? (
                            `Check-out: ${formatTime(
                              item.endDateTime!,
                              timezone
                            )}`
                          ) : item.type === "transportation" ? (
                            <>
                              {formatTime(item.dateTime, timezone)}
                              {item.endDateTime &&
                                ` - ${formatTime(item.endDateTime, timezone)}`}
                              {timezone && ` ${getTimezoneAbbr(timezone)}`}
                              {item.durationMinutes &&
                                item.durationMinutes > 0 && (
                                  <span className="text-gray-400 dark:text-gray-500">
                                    {" "}
                                    ({formatDuration(item.durationMinutes)}
                                    {item.distanceKm && `, ${formatDistance(item.distanceKm)}`})
                                  </span>
                                )}
                              {!item.durationMinutes && item.distanceKm && (
                                <span className="text-gray-400 dark:text-gray-500">
                                  {" "}
                                  ({formatDistance(item.distanceKm)})
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {formatTime(item.dateTime, timezone)}
                              {item.endDateTime &&
                                ` - ${formatTime(item.endDateTime, timezone)}`}
                              {item.durationMinutes &&
                                item.durationMinutes > 0 && (
                                  <span className="text-gray-400 dark:text-gray-500">
                                    {" "}
                                    ({formatDuration(item.durationMinutes)})
                                  </span>
                                )}
                            </>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {item.title}
                        </h4>
                        {item.subtitle && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.subtitle}
                          </p>
                        )}
                        {/* Flight/booking numbers */}
                        {(item.vehicleNumber || item.confirmationNumber) && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono">
                            {item.vehicleNumber && (
                              <span className="inline-flex items-center gap-1">
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                                  />
                                </svg>
                                {item.vehicleNumber}
                              </span>
                            )}
                            {item.vehicleNumber && item.confirmationNumber && (
                              <span className="mx-2">|</span>
                            )}
                            {item.confirmationNumber && (
                              <span className="inline-flex items-center gap-1">
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                {item.confirmationNumber}
                              </span>
                            )}
                          </p>
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
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {item.location}
                      </div>
                    )}

                    {item.description && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {item.description}
                      </p>
                    )}

                    {/* Connection Badge */}
                    {connectionInfo && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-xs font-medium text-green-700 dark:text-green-300">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        Connection: Leg {connectionInfo.legNumber} of{" "}
                        {connectionInfo.totalLegs}
                      </div>
                    )}

                    {/* Multi-Day Stay Badge */}
                    {item.multiDayInfo && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-xs font-medium text-purple-700 dark:text-purple-300">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                          />
                        </svg>
                        Night {item.multiDayInfo.nightNumber} of{" "}
                        {item.multiDayInfo.totalNights}
                      </div>
                    )}

                    {/* Photo Albums */}
                    {item.photoAlbums && item.photoAlbums.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.photoAlbums.slice(0, 3).map((album) => (
                          <Link
                            key={album.id}
                            to={`/trips/${tripId}/albums/${album.id}`}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="truncate max-w-[100px]">
                              {album.name}
                            </span>
                            {album._count?.photoAssignments !== undefined && (
                              <span className="text-gray-400 dark:text-gray-500">
                                ({album._count.photoAssignments})
                              </span>
                            )}
                          </Link>
                        ))}
                        {item.photoAlbums.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
                            +{item.photoAlbums.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Show associated journal entries for activities, lodging, and transportation */}
                    {item.type !== "journal" &&
                      "journalAssignments" in item.data &&
                      item.data.journalAssignments &&
                      item.data.journalAssignments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <svg
                              className="w-4 h-4 text-orange-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                              />
                            </svg>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              Journal{" "}
                              {item.data.journalAssignments.length === 1
                                ? "Entry"
                                : "Entries"}
                              :
                            </span>
                          </div>
                          <div className="space-y-2">
                            {item.data.journalAssignments.map(
                              (assignment: {
                                id: number;
                                journal: {
                                  title?: string | null;
                                  content?: string;
                                };
                              }) => (
                                <div
                                  key={assignment.id}
                                  className="w-full text-left text-sm bg-orange-50 dark:bg-orange-900/20 rounded p-2"
                                >
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {assignment.journal.title ||
                                      "Untitled Entry"}
                                  </div>
                                  {assignment.journal.content && (
                                    <div className="text-gray-600 dark:text-gray-400 mt-1">
                                      {assignment.journal.content.substring(
                                        0,
                                        100
                                      )}
                                      {assignment.journal.content.length > 100
                                        ? "..."
                                        : ""}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const getTransportIcon = (transportType?: TransportationType) => {
    switch (transportType) {
      case "flight":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        );
      case "train":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 18h8M8 6h8m-8 6h8M6 6v12a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2z"
            />
          </svg>
        );
      case "bus":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 18h.01M16 18h.01M6 6h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2zM6 10h12"
            />
          </svg>
        );
      case "car":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 17h.01M16 17h.01M5 11l2-6h10l2 6M5 11v6a1 1 0 001 1h1m12-7v6a1 1 0 01-1 1h-1M5 11h14"
            />
          </svg>
        );
      case "ferry":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 17c1.5 0 3-1 3-1s1.5 1 3 1 3-1 3-1 1.5 1 3 1 3-1 3-1 1.5 1 3 1M5 12l2-7h10l2 7M8 12v2m8-2v2"
            />
          </svg>
        );
      case "bicycle":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 17a3 3 0 100-6 3 3 0 000 6zm14 0a3 3 0 100-6 3 3 0 000 6zM5 14l4-7h4l2 4h4"
            />
          </svg>
        );
      case "walk":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7a2 2 0 11-4 0 2 2 0 014 0zm-2 3v4m0 0l-2 4m2-4l2 4m-4-8l-2 2m6-2l2 2"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        );
    }
  };

  const getIcon = (type: TimelineItemType, item?: TimelineItem) => {
    switch (type) {
      case "activity":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case "transportation":
        return getTransportIcon(item?.transportationType);
      case "lodging":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        );
      case "journal":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        );
    }
  };

  const getTypeColor = (type: TimelineItemType) => {
    switch (type) {
      case "activity":
        return "bg-blue-500";
      case "transportation":
        return "bg-green-500";
      case "lodging":
        return "bg-purple-500";
      case "journal":
        return "bg-orange-500";
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-900 dark:text-white">
        Loading timeline...
      </div>
    );
  }

  if (timelineItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No timeline items yet. Add activities, transportation, lodging, or
        journal entries to see them here.
      </div>
    );
  }

  // Helper to extract locations from day's items for mini-map
  const getDayLocations = (items: TimelineItem[]) => {
    const locations: Array<{
      name: string;
      latitude: number;
      longitude: number;
      type?: "activity" | "transportation" | "lodging";
    }> = [];
    const seenCoords = new Set<string>();

    items.forEach((item) => {
      // Activity/lodging locations
      if (item.locationCoords && item.location) {
        const key = `${item.locationCoords.latitude},${item.locationCoords.longitude}`;
        if (!seenCoords.has(key)) {
          seenCoords.add(key);
          locations.push({
            name: item.location,
            latitude: item.locationCoords.latitude,
            longitude: item.locationCoords.longitude,
            type:
              item.type === "activity"
                ? "activity"
                : item.type === "lodging"
                ? "lodging"
                : undefined,
          });
        }
      }

      // Transportation from/to locations
      if (item.type === "transportation") {
        const trans = item.data as Transportation;
        if (item.fromCoords && trans.fromLocationName) {
          const key = `${item.fromCoords.latitude},${item.fromCoords.longitude}`;
          if (!seenCoords.has(key)) {
            seenCoords.add(key);
            locations.push({
              name: trans.fromLocationName,
              latitude: item.fromCoords.latitude,
              longitude: item.fromCoords.longitude,
              type: "transportation",
            });
          }
        }
        if (item.toCoords && trans.toLocationName) {
          const key = `${item.toCoords.latitude},${item.toCoords.longitude}`;
          if (!seenCoords.has(key)) {
            seenCoords.add(key);
            locations.push({
              name: trans.toLocationName,
              latitude: item.toCoords.latitude,
              longitude: item.toCoords.longitude,
              type: "transportation",
            });
          }
        }
      }
    });

    return locations;
  };

  // Helper to get filter button styles
  const getFilterButtonClass = (type: TimelineItemType) => {
    const baseClass =
      "px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5";
    const isActive = visibleTypes.has(type);

    if (isActive) {
      switch (type) {
        case "activity":
          return `${baseClass} bg-blue-500 text-white`;
        case "transportation":
          return `${baseClass} bg-green-500 text-white`;
        case "lodging":
          return `${baseClass} bg-purple-500 text-white`;
        case "journal":
          return `${baseClass} bg-orange-500 text-white`;
      }
    }
    return `${baseClass} bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600`;
  };

  const filterLabels: Record<TimelineItemType, string> = {
    activity: "Activities",
    transportation: "Transport",
    lodging: "Lodging",
    journal: "Journal",
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="timeline-container">
      {/* Print Styles */}
      <style>{`
        @media print {
          /* Hide non-essential elements when printing */
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

          /* Show only the timeline content */
          .timeline-container {
            padding: 0 !important;
            margin: 0 !important;
          }

          .timeline-content {
            display: block !important;
          }

          /* Ensure good print layout */
          .timeline-day {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 1rem !important;
          }

          .timeline-item {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Force light theme for printing */
          * {
            color: black !important;
            background: white !important;
            border-color: #ccc !important;
          }

          /* Hide the second timezone column on print */
          .timeline-dual-column > div:nth-child(2),
          .timeline-dual-column > div:nth-child(3) {
            display: none !important;
          }

          .timeline-dual-column > div:first-child {
            width: 100% !important;
            flex: none !important;
          }
        }
      `}</style>

      {/* Filter Bar */}
      <div className="timeline-filter-bar flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700 print:hidden">
        <span className="text-sm text-gray-500 dark:text-gray-400 self-center mr-2">
          Filter:
        </span>
        {(
          [
            "activity",
            "transportation",
            "lodging",
            "journal",
          ] as TimelineItemType[]
        ).map((type) => (
          <button
            type="button"
            key={type}
            onClick={() => toggleType(type)}
            className={getFilterButtonClass(type)}
          >
            {getIcon(type)}
            <span>{filterLabels[type]}</span>
            {visibleTypes.has(type) && (
              <span className="ml-1 w-4 h-4 rounded-full bg-white/30 text-xs flex items-center justify-center">
                {timelineItems.filter((i) => i.type === type).length}
              </span>
            )}
          </button>
        ))}

        {/* Print Button */}
        <div className="ml-auto">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center gap-1.5"
            title="Print timeline"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Timezone headers/tabs - only show when dual timezone is enabled */}
      {showDualTimezone && (
        <div className="timeline-timezone-tabs print:hidden">
          {/* Mobile: Tab Switcher */}
          <div className="md:hidden mb-6 sticky top-16 bg-white dark:bg-gray-900 z-20 py-4 border-b-2 border-gray-300 dark:border-gray-600">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMobileActiveTimezone("trip")}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  mobileActiveTimezone === "trip"
                    ? "bg-blue-600 dark:bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                <div className="text-sm">Trip Timezone</div>
                <div className="text-xs opacity-75">
                  {getTimezoneAbbr(tripTimezone!)}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMobileActiveTimezone("user")}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  mobileActiveTimezone === "user"
                    ? "bg-blue-600 dark:bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                <div className="text-sm">Your Timezone</div>
                <div className="text-xs opacity-75">
                  {getTimezoneAbbr(userTimezone!)}
                </div>
              </button>
            </div>
          </div>

          {/* Desktop: Side-by-side Headers */}
          <div className="hidden md:flex gap-8 mb-6 sticky top-16 bg-white dark:bg-gray-900 z-20 py-4 border-b-2 border-gray-300 dark:border-gray-600">
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
        </div>
      )}

      <div className="timeline-content space-y-8">
        {sortedDateKeys.map((dateKey) => {
          const items = allGroupedItems[dateKey];
          const dayWeather = weatherData[dateKey];
          const isToday = dateKey === new Date().toDateString();
          const isTripInProgress = tripStatus === "In Progress";
          const showTodayHighlight = isToday && isTripInProgress;
          const isEmpty = items.length === 0;

          return (
            <div key={dateKey} className="timeline-day">
              <button
                type="button"
                onClick={() => toggleDay(dateKey)}
                className={`w-full text-left text-lg font-semibold mb-4 sticky top-16 py-2 pl-4 pr-4 border-b z-20 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity ${
                  showTodayHighlight
                    ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100"
                    : isEmpty
                    ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                }`}
              >
                <span className="flex items-center">
                  {showTodayHighlight && (
                    <span className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500 text-white">
                      TODAY
                    </span>
                  )}
                  {formatDate(dateKey)}
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                    {isEmpty
                      ? "(No activities)"
                      : `(${items.length} ${
                          items.length === 1 ? "item" : "items"
                        })`}
                  </span>
                </span>
                <svg
                  className={`w-5 h-5 transform transition-transform ${
                    collapsedDays.has(dateKey) ? "" : "rotate-180"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {!collapsedDays.has(dateKey) && (
                <>
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

                  {/* Mini Map for the day */}
                  {!isEmpty && (
                    <DayMiniMap
                      locations={getDayLocations(items)}
                      defaultExpanded={false}
                    />
                  )}

                  {isEmpty ? (
                    /* Empty Day Placeholder */
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/30">
                      <svg
                        className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">
                        No activities scheduled for this day
                      </p>
                    </div>
                  ) : showDualTimezone ? (
                    <>
                      {/* Desktop: Side-by-side columns */}
                      <div className="timeline-dual-column hidden md:flex gap-8">
                        {renderTimelineColumn(items, tripTimezone)}
                        <div className="w-px bg-gray-300 dark:bg-gray-600"></div>
                        {renderTimelineColumn(items, userTimezone)}
                      </div>

                      {/* Mobile: Single column based on active timezone */}
                      <div className="md:hidden">
                        {mobileActiveTimezone === "trip"
                          ? renderTimelineColumn(items, tripTimezone)
                          : renderTimelineColumn(items, userTimezone)}
                      </div>
                    </>
                  ) : (
                    renderTimelineColumn(items)
                  )}
                </>
              )}
            </div>
          );
        })}
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
