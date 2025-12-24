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
  { value: "", label: "Use trip timezone" },
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
