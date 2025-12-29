/**
 * Timezone utility functions for Captain's Log
 *
 * Handles timezone conversions and formatting for activities, transportation, and lodging
 */

/**
 * Format a date/time string in a specific timezone
 * @param dateTime ISO datetime string
 * @param timezone IANA timezone string (e.g., "America/New_York")
 * @param fallbackTimezone Fallback timezone if timezone is null/undefined
 * @param includeTimezone Whether to include timezone abbreviation in output
 */
export function formatDateTimeInTimezone(
  dateTime: string | null | undefined,
  timezone?: string | null,
  fallbackTimezone?: string | null,
  options: {
    includeTimezone?: boolean;
    format?: 'short' | 'medium' | 'long';
  } = {}
): string {
  if (!dateTime) return "Not set";

  const {
    includeTimezone = true,
    format = 'medium'
  } = options;

  const date = new Date(dateTime);
  const effectiveTimezone = timezone || fallbackTimezone || undefined;

  // Base formatting options based on format type
  let formatOptions: Intl.DateTimeFormatOptions;

  switch (format) {
    case 'short':
      formatOptions = {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      };
      break;
    case 'long':
      formatOptions = {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      };
      break;
    case 'medium':
    default:
      formatOptions = {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      };
      break;
  }

  // Add timezone if specified
  if (effectiveTimezone) {
    formatOptions.timeZone = effectiveTimezone;
    if (includeTimezone) {
      formatOptions.timeZoneName = "short";
    }
  }

  try {
    return date.toLocaleString("en-US", formatOptions);
  } catch (error) {
    // Fallback if timezone is invalid
    console.warn(`Invalid timezone: ${effectiveTimezone}`, error);
    return date.toLocaleString("en-US", {
      ...formatOptions,
      timeZone: undefined,
      timeZoneName: undefined,
    });
  }
}

/**
 * Format date only (no time) in a specific timezone
 */
export function formatDateInTimezone(
  dateTime: string | null | undefined,
  timezone?: string | null,
  fallbackTimezone?: string | null
): string {
  if (!dateTime) return "Not set";

  const date = new Date(dateTime);
  const effectiveTimezone = timezone || fallbackTimezone || undefined;

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  if (effectiveTimezone) {
    formatOptions.timeZone = effectiveTimezone;
  }

  try {
    return date.toLocaleDateString("en-US", formatOptions);
  } catch (error) {
    console.warn(`Invalid timezone: ${effectiveTimezone}`, error);
    return date.toLocaleDateString("en-US");
  }
}

/**
 * Format time only (no date) in a specific timezone
 */
export function formatTimeInTimezone(
  dateTime: string | null | undefined,
  timezone?: string | null,
  fallbackTimezone?: string | null,
  includeTimezone: boolean = true
): string {
  if (!dateTime) return "Not set";

  const date = new Date(dateTime);
  const effectiveTimezone = timezone || fallbackTimezone || undefined;

  const formatOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };

  if (effectiveTimezone) {
    formatOptions.timeZone = effectiveTimezone;
    if (includeTimezone) {
      formatOptions.timeZoneName = "short";
    }
  }

  try {
    return date.toLocaleTimeString("en-US", formatOptions);
  } catch (error) {
    console.warn(`Invalid timezone: ${effectiveTimezone}`, error);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
}

/**
 * Get timezone abbreviation (e.g., "PST", "EST")
 */
export function getTimezoneAbbreviation(
  timezone: string,
  date: Date = new Date()
): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(date);
    const timeZonePart = parts.find((part) => part.type === "timeZoneName");
    return timeZonePart?.value || timezone;
  } catch {
    return timezone;
  }
}

/**
 * Common timezone options for select dropdowns
 */
export const commonTimezones = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Pacific/Auckland", label: "Auckland" },
];

/**
 * Get timezone options for select dropdown
 * Returns an array that can be mapped in JSX
 */
export function getTimezoneOptions() {
  return commonTimezones;
}

/**
 * Calculate duration between two times, accounting for timezones
 */
export function calculateDuration(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string {
  if (!startTime || !endTime) return "";

  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();

  if (diffMs < 0) return "Invalid duration";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Convert a datetime-local input value to an ISO string that preserves
 * the wall-clock time in the specified timezone.
 *
 * Example: "2025-01-15T14:00" in "America/New_York" timezone
 * -> Returns an ISO string representing 2:00 PM Eastern Time
 *
 * @param dateTimeLocal Value from datetime-local input (YYYY-MM-DDTHH:mm)
 * @param timezone IANA timezone string
 * @returns ISO 8601 string in UTC that represents the local time
 */
export function convertDateTimeLocalToISO(
  dateTimeLocal: string,
  timezone: string
): string {
  // Parse the datetime-local value (format: YYYY-MM-DDTHH:mm)
  const [datePart, timePart] = dateTimeLocal.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);


  // Create a formatter for the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // We need to find the UTC timestamp that, when displayed in the target timezone, shows our desired time
  // Strategy: Create a date assuming UTC, then adjust for the timezone offset

  // First, parse as if it's in the target timezone
  // We'll use a clever trick: format a known UTC time in the target timezone to find the offset
  const testDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  // Format this test date in the target timezone
  const parts = formatter.formatToParts(testDate);
  const tzYear = parseInt(parts.find(p => p.type === 'year')!.value);
  const tzMonth = parseInt(parts.find(p => p.type === 'month')!.value);
  const tzDay = parseInt(parts.find(p => p.type === 'day')!.value);
  const tzHour = parseInt(parts.find(p => p.type === 'hour')!.value);
  const tzMinute = parseInt(parts.find(p => p.type === 'minute')!.value);

  // Calculate the difference in minutes between what we want and what we got
  const wantedMinutes = year * 525600 + (month - 1) * 43200 + day * 1440 + hour * 60 + minute;
  const gotMinutes = tzYear * 525600 + (tzMonth - 1) * 43200 + tzDay * 1440 + tzHour * 60 + tzMinute;
  const diffMinutes = wantedMinutes - gotMinutes;

  // Adjust the test date by the difference
  const adjustedDate = new Date(testDate.getTime() + diffMinutes * 60 * 1000);

  return adjustedDate.toISOString();
}

/**
 * Convert an ISO timestamp to a datetime-local input value,
 * showing the wall-clock time in the specified timezone.
 *
 * Example: ISO string representing 7:00 PM UTC with "America/New_York" timezone
 * -> Returns "2025-01-15T14:00" (2:00 PM Eastern)
 *
 * @param isoString ISO 8601 string (typically in UTC)
 * @param timezone IANA timezone string
 * @returns datetime-local format string (YYYY-MM-DDTHH:mm)
 */
export function convertISOToDateTimeLocal(
  isoString: string,
  timezone: string
): string {
  const date = new Date(isoString);

  // Format the date in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  const hour = parts.find(p => p.type === 'hour')!.value;
  const minute = parts.find(p => p.type === 'minute')!.value;

  return `${year}-${month}-${day}T${hour}:${minute}`;
}
