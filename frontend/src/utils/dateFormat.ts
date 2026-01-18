/**
 * Date formatting utilities for consistent date display across the app
 *
 * Natural Language Date Formatting Standards:
 * | Context | Format | Example |
 * |---------|--------|---------|
 * | Trip dates (same month) | "MMM D-D, YYYY" | "Mar 15-22, 2024" |
 * | Trip dates (different months) | "MMM D - MMM D, YYYY" | "Mar 28 - Apr 5, 2024" |
 * | Relative (future, <30 days) | "In X days/weeks" | "In 2 weeks" |
 * | Relative (past, <30 days) | "X days/weeks ago" | "3 weeks ago" |
 * | Relative (future, >30 days) | "In X months" | "In 3 months" |
 * | Single date | "Weekday, MMM D" | "Saturday, Mar 15" |
 */

export type DateFormatStyle = 'short' | 'medium' | 'long' | 'full';

/**
 * Format a date string for display, handling timezone issues correctly
 * Parses the date string directly to avoid timezone shifts
 * 
 * @param date - Date string in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
 * @param style - Format style: 'short', 'medium', 'long', or 'full'
 * @param fallback - Text to return if date is null/undefined
 * @returns Formatted date string
 * 
 * @example
 * formatDate('2024-03-15') // "Mar 15, 2024"
 * formatDate('2024-03-15', 'short') // "3/15/24"
 * formatDate('2024-03-15', 'long') // "March 15, 2024"
 * formatDate(null) // "Not set"
 */
export function formatDate(
  date: string | Date | null | undefined,
  style: DateFormatStyle = 'medium',
  fallback: string = 'Not set'
): string {
  if (!date) return fallback;

  try {
    // Parse date string directly to avoid timezone shifts
    // Date strings from backend are typically in YYYY-MM-DD format
    
    let dateStr = '';
    if (typeof date === 'string') {
      dateStr = date.split('T')[0];
    } else if (date instanceof Date) {
      dateStr = (date as Date).toISOString().split('T')[0];
    } else {
      console.error(`Invalid date type: ${typeof date}`, date);
      return fallback;
    }

    const [year, month, day] = dateStr.split('-').map(Number);

    // Validate that we got valid numbers
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error(`Invalid date format: ${date}`);
      return fallback;
    }

    const dateObj = new Date(year, month - 1, day); // month is 0-indexed

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.error(`Invalid date: ${date}`);
      return fallback;
    }

    const options: Record<DateFormatStyle, Intl.DateTimeFormatOptions> = {
      short: { year: '2-digit', month: 'numeric', day: 'numeric' },
      medium: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric' },
      full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    };

    return dateObj.toLocaleDateString('en-US', options[style]);
  } catch (error) {
    console.error(`Error formatting date: ${date}`, error);
    return fallback;
  }
}

/**
 * Format a date range for display
 * 
 * @param startDate - Start date string
 * @param endDate - End date string
 * @param style - Format style
 * @returns Formatted date range string
 * 
 * @example
 * formatDateRange('2024-03-15', '2024-03-20') // "Mar 15 - Mar 20, 2024"
 * formatDateRange('2024-03-15', null) // "Mar 15, 2024 - TBD"
 */
export function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  style: DateFormatStyle = 'medium'
): string {
  const start = formatDate(startDate, style, 'TBD');
  const end = formatDate(endDate, style, 'TBD');

  if (start === 'TBD' && end === 'TBD') return 'Dates not set';
  if (start === 'TBD') return `TBD - ${end}`;
  if (end === 'TBD') return `${start} - TBD`;

  // If same year, omit year from start date for cleaner display
  if (startDate && endDate) {
    const startStr = typeof startDate === 'string' ? startDate : new Date(startDate).toISOString();
    const endStr = typeof endDate === 'string' ? endDate : new Date(endDate).toISOString();

    const startYear = startStr.split('-')[0];
    const endYear = endStr.split('-')[0];
    if (startYear === endYear && style === 'medium') {
      const startNoYear = formatDate(startDate, 'medium').replace(`, ${startYear}`, '');
      return `${startNoYear} - ${end}`;
    }
  }

  return `${start} - ${end}`;
}

/**
 * Get relative time description (e.g., "2 days ago", "in 3 weeks")
 * 
 * @param date - Date string to compare
 * @returns Relative time string
 */
export function getRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    let dateStr = '';
    if (typeof date === 'string') {
      dateStr = date.split('T')[0];
    } else if (date instanceof Date) {
      dateStr = (date as Date).toISOString().split('T')[0];
    } else {
      return formatDate(date, 'medium');
    }

    const [year, month, day] = dateStr.split('-').map(Number);

    // Validate date components
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return formatDate(date, 'medium');
    }

    const dateObj = new Date(year, month - 1, day);

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return formatDate(date, 'medium');
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const diffTime = dateObj.getTime() - now.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
    if (diffDays > 7 && diffDays <= 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
    if (diffDays < -7 && diffDays >= -30) return `${Math.ceil(Math.abs(diffDays) / 7)} weeks ago`;

    return formatDate(date, 'medium');
  } catch (error) {
    console.error(`Error calculating relative time: ${date}`, error);
    return formatDate(date, 'medium');
  }
}

/**
 * Format time from a datetime string
 *
 * @param datetime - Datetime string
 * @param use24Hour - Whether to use 24-hour format
 * @returns Formatted time string
 */
export function formatTime(
  datetime: string | null | undefined,
  use24Hour: boolean = false
): string {
  if (!datetime) return '';

  const date = new Date(datetime);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !use24Hour,
  });
}

/**
 * Helper function to parse a date string into year, month, day
 */
function parseDateToComponents(date: string | Date | null | undefined): { year: number; month: number; day: number; dateObj: Date } | null {
  if (!date) return null;

  try {
    let dateStr = '';
    if (typeof date === 'string') {
      dateStr = date.split('T')[0];
    } else if (date instanceof Date) {
      dateStr = date.toISOString().split('T')[0];
    } else {
      return null;
    }

    const [year, month, day] = dateStr.split('-').map(Number);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }

    const dateObj = new Date(year, month - 1, day);
    if (isNaN(dateObj.getTime())) {
      return null;
    }

    return { year, month, day, dateObj };
  } catch {
    return null;
  }
}

/**
 * Format a trip date range in natural language
 *
 * Handles:
 * - Same month: "Mar 15-22, 2024"
 * - Different months, same year: "Mar 28 - Apr 5, 2024"
 * - Different years: "Dec 30, 2024 - Jan 5, 2025"
 * - Single day trips: "Mar 15, 2024"
 *
 * @param startDate - Start date string
 * @param endDate - End date string
 * @returns Natural language date range string
 *
 * @example
 * formatTripDates('2024-03-15', '2024-03-22') // "Mar 15-22, 2024"
 * formatTripDates('2024-03-28', '2024-04-05') // "Mar 28 - Apr 5, 2024"
 * formatTripDates('2024-03-15', '2024-03-15') // "Mar 15, 2024"
 */
export function formatTripDates(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string {
  const start = parseDateToComponents(startDate);
  const end = parseDateToComponents(endDate);

  // Handle missing dates
  if (!start && !end) return 'Dates not set';
  if (!start) return `Ends ${formatDate(endDate, 'medium')}`;
  if (!end) return `Starts ${formatDate(startDate, 'medium')}`;

  const sameYear = start.year === end.year;
  const sameMonth = start.month === end.month && sameYear;
  const sameDay = sameMonth && start.day === end.day;

  const startMonthName = start.dateObj.toLocaleDateString('en-US', { month: 'short' });
  const endMonthName = end.dateObj.toLocaleDateString('en-US', { month: 'short' });

  // Single day trip
  if (sameDay) {
    return `${startMonthName} ${start.day}, ${start.year}`;
  }

  // Same month and year: "Mar 15-22, 2024"
  if (sameMonth) {
    return `${startMonthName} ${start.day}-${end.day}, ${start.year}`;
  }

  // Different months, same year: "Mar 28 - Apr 5, 2024"
  if (sameYear) {
    return `${startMonthName} ${start.day} - ${endMonthName} ${end.day}, ${start.year}`;
  }

  // Different years: "Dec 30, 2024 - Jan 5, 2025"
  return `${startMonthName} ${start.day}, ${start.year} - ${endMonthName} ${end.day}, ${end.year}`;
}

/**
 * Get a relative time description with extended range support
 *
 * Returns natural language relative time for dates within reasonable range,
 * otherwise falls back to formatted date.
 *
 * @param date - Date to compare against now
 * @returns Relative time string or formatted date
 *
 * @example
 * getRelativeDateDescription('2024-01-17') // "Tomorrow" (if today is Jan 16)
 * getRelativeDateDescription('2024-01-20') // "In 4 days"
 * getRelativeDateDescription('2024-02-15') // "In 1 month"
 * getRelativeDateDescription('2024-03-15') // "In 2 months"
 * getRelativeDateDescription('2023-12-01') // "Dec 1, 2023" (too far in past)
 */
export function getRelativeDateDescription(date: string | Date | null | undefined): string {
  const parsed = parseDateToComponents(date);
  if (!parsed) return '';

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffTime = parsed.dateObj.getTime() - now.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const absDays = Math.abs(diffDays);

  // Today, Tomorrow, Yesterday
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  // Within a week
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${absDays} days ago`;

  // Within a month (8-30 days) - use weeks
  if (diffDays > 7 && diffDays <= 30) {
    const weeks = Math.round(diffDays / 7);
    return weeks === 1 ? 'In 1 week' : `In ${weeks} weeks`;
  }
  if (diffDays < -7 && diffDays >= -30) {
    const weeks = Math.round(absDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }

  // Within a year (31-365 days) - use months
  if (diffDays > 30 && diffDays <= 365) {
    const months = Math.round(diffDays / 30);
    return months === 1 ? 'In 1 month' : `In ${months} months`;
  }
  if (diffDays < -30 && diffDays >= -365) {
    const months = Math.round(absDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  // Beyond a year - return formatted date
  return formatDate(date, 'medium');
}

/**
 * Format trip dates with relative time context
 *
 * Combines absolute date range with relative time for context.
 * Shows format like: "In 2 weeks (Mar 15-22, 2024)"
 *
 * @param startDate - Trip start date
 * @param endDate - Trip end date
 * @param options - Formatting options
 * @returns Combined date string with relative context
 *
 * @example
 * formatTripDatesWithRelative('2024-03-15', '2024-03-22')
 * // "In 2 weeks (Mar 15-22, 2024)"
 *
 * formatTripDatesWithRelative('2024-01-10', '2024-01-15') // if trip is in past
 * // "1 week ago (Jan 10-15, 2024)"
 */
export function formatTripDatesWithRelative(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  options: {
    showRelativeOnly?: boolean;
    showAbsoluteOnly?: boolean;
  } = {}
): string {
  const { showRelativeOnly = false, showAbsoluteOnly = false } = options;

  const absoluteDates = formatTripDates(startDate, endDate);

  if (showAbsoluteOnly || !startDate) {
    return absoluteDates;
  }

  const relative = getRelativeDateDescription(startDate);

  if (showRelativeOnly || !relative) {
    // If no valid relative description or past event far in the past
    return absoluteDates;
  }

  // Don't show relative for "Today" or dates that fall back to absolute format
  // Check if relative looks like an absolute date (contains comma or year)
  if (relative.includes(',') || /\d{4}/.test(relative)) {
    return absoluteDates;
  }

  return `${relative} (${absoluteDates})`;
}

/**
 * Get trip status message based on dates
 *
 * Returns a human-readable status for the trip timing.
 *
 * @param startDate - Trip start date
 * @param endDate - Trip end date
 * @returns Status message
 *
 * @example
 * getTripDateStatus('2024-03-15', '2024-03-22') // "Starts in 2 weeks"
 * getTripDateStatus('2024-01-10', '2024-01-15') // "Ended 3 weeks ago" (if today is Feb)
 * getTripDateStatus('2024-01-14', '2024-01-18') // "In progress" (if today is Jan 15)
 */
export function getTripDateStatus(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string | null {
  const start = parseDateToComponents(startDate);
  const end = parseDateToComponents(endDate);

  if (!start) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const startDiff = Math.round((start.dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const endDiff = end ? Math.round((end.dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  // Trip hasn't started yet
  if (startDiff > 0) {
    const relative = getRelativeDateDescription(startDate);
    if (relative === 'Tomorrow') return 'Starts tomorrow';
    if (relative.startsWith('In ')) return `Starts ${relative.toLowerCase()}`;
    return null;
  }

  // Trip has started
  if (startDiff <= 0 && endDiff !== null) {
    // Trip is ongoing
    if (endDiff >= 0) {
      if (startDiff === 0) return 'Starts today';
      if (endDiff === 0) return 'Ends today';
      return 'In progress';
    }

    // Trip has ended
    const endRelative = getRelativeDateDescription(endDate);
    if (endRelative === 'Yesterday') return 'Ended yesterday';
    if (endRelative.endsWith(' ago')) return `Ended ${endRelative}`;
  }

  return null;
}

/**
 * Format a single date with weekday for display
 *
 * @param date - Date to format
 * @returns Formatted date like "Saturday, Mar 15"
 *
 * @example
 * formatSingleDate('2024-03-15') // "Saturday, Mar 15"
 */
export function formatSingleDate(date: string | Date | null | undefined): string {
  const parsed = parseDateToComponents(date);
  if (!parsed) return 'Not set';

  return parsed.dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calculate trip duration in days
 *
 * @param startDate - Trip start date
 * @param endDate - Trip end date
 * @returns Number of days or null
 */
export function getTripDurationDays(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): number | null {
  const start = parseDateToComponents(startDate);
  const end = parseDateToComponents(endDate);

  if (!start || !end) return null;

  const diffTime = end.dateObj.getTime() - start.dateObj.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
}

/**
 * Format trip duration as human-readable string
 *
 * @param startDate - Trip start date
 * @param endDate - Trip end date
 * @returns Duration string like "7 days" or "2 weeks"
 *
 * @example
 * formatTripDuration('2024-03-15', '2024-03-22') // "8 days"
 * formatTripDuration('2024-03-15', '2024-03-15') // "1 day"
 */
export function formatTripDuration(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string {
  const days = getTripDurationDays(startDate, endDate);
  if (days === null) return '';
  if (days === 1) return '1 day';
  if (days < 14) return `${days} days`;
  const weeks = Math.round(days / 7);
  return weeks === 1 ? '1 week' : `${weeks} weeks`;
}

