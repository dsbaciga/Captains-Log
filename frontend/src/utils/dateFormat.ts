/**
 * Date formatting utilities for consistent date display across the app
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
  date: string | null | undefined,
  style: DateFormatStyle = 'medium',
  fallback: string = 'Not set'
): string {
  if (!date) return fallback;

  try {
    // Parse date string directly to avoid timezone shifts
    // Date strings from backend are typically in YYYY-MM-DD format
    const dateStr = date.split('T')[0];
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
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  style: DateFormatStyle = 'medium'
): string {
  const start = formatDate(startDate, style, 'TBD');
  const end = formatDate(endDate, style, 'TBD');

  if (start === 'TBD' && end === 'TBD') return 'Dates not set';
  if (start === 'TBD') return `TBD - ${end}`;
  if (end === 'TBD') return `${start} - TBD`;

  // If same year, omit year from start date for cleaner display
  if (startDate && endDate) {
    const startYear = startDate.split('-')[0];
    const endYear = endDate.split('-')[0];
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
export function getRelativeTime(date: string | null | undefined): string {
  if (!date) return '';

  try {
    const dateStr = date.split('T')[0];
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

