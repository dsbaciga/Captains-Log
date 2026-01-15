import type { TimelineItem, TimelineItemType, ConnectionInfo } from './types';

/**
 * Get date string in a specific timezone
 */
export function getDateStringInTimezone(date: Date, timezone?: string): string {
  if (!timezone) {
    return date.toDateString();
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return formatter.format(date);
  } catch (error) {
    console.warn(`Invalid timezone: ${timezone}`, error);
    return date.toDateString();
  }
}

/**
 * Format time in a specific timezone
 */
export function formatTime(date: Date, timezone?: string): string {
  if (timezone) {
    return date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get timezone abbreviation
 */
export function getTimezoneAbbr(timezone: string): string {
  const abbrs: Record<string, string> = {
    UTC: 'UTC',
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
    'Pacific/Auckland': 'NZST/NZDT',
  };
  return abbrs[timezone] || timezone.split('/').pop() || timezone;
}

/**
 * Format duration in minutes to human readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format distance in kilometers
 */
export function formatDistance(kilometers: number | null | undefined): string {
  if (kilometers == null || typeof kilometers !== 'number' || isNaN(kilometers)) {
    return 'Unknown distance';
  }
  const miles = kilometers * 0.621371;
  return `${kilometers.toFixed(1)} km (${miles.toFixed(1)} mi)`;
}

/**
 * Get day number from trip start date
 */
export function getDayNumber(dateString: string, tripStartDate?: string): number | null {
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
}

/**
 * Format date for display
 */
export function formatDateDisplay(dateString: string, tripStartDate?: string): string {
  const date = new Date(dateString);
  const dayNumber = getDayNumber(dateString, tripStartDate);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return dayNumber && dayNumber > 0 ? `Day ${dayNumber} - ${formattedDate}` : formattedDate;
}

/**
 * Get background color class for timeline item type
 */
export function getTypeColor(type: TimelineItemType): string {
  switch (type) {
    case 'activity':
      return 'bg-green-500';
    case 'transportation':
      return 'bg-blue-500';
    case 'lodging':
      return 'bg-purple-500';
    case 'journal':
      return 'bg-amber-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Get border color class for timeline item type
 */
export function getTypeBorderColor(type: TimelineItemType): string {
  switch (type) {
    case 'activity':
      return 'border-l-green-500';
    case 'transportation':
      return 'border-l-blue-500';
    case 'lodging':
      return 'border-l-purple-500';
    case 'journal':
      return 'border-l-amber-500';
    default:
      return 'border-l-gray-500';
  }
}

/**
 * Get text color class for timeline item type
 */
export function getTypeTextColor(type: TimelineItemType): string {
  switch (type) {
    case 'activity':
      return 'text-green-600 dark:text-green-400';
    case 'transportation':
      return 'text-blue-600 dark:text-blue-400';
    case 'lodging':
      return 'text-purple-600 dark:text-purple-400';
    case 'journal':
      return 'text-amber-600 dark:text-amber-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

/**
 * Get connection info for a timeline item within a group
 */
export function getConnectionInfo(
  item: TimelineItem,
  items: TimelineItem[]
): ConnectionInfo | null {
  if (!item.connectionGroupId) return null;

  // Defensive check: ensure items is an array
  if (!Array.isArray(items)) {
    console.warn('getConnectionInfo: items is not an array', { item, items });
    return null;
  }

  const group = items.filter((i) => i.connectionGroupId === item.connectionGroupId);
  if (group.length < 2) return null;

  const sortedGroup = [...group].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  const index = sortedGroup.findIndex((i) => i.id === item.id);

  return {
    legNumber: index + 1,
    totalLegs: sortedGroup.length,
    isFirst: index === 0,
    isLast: index === sortedGroup.length - 1,
    groupId: item.connectionGroupId,
  };
}

/**
 * Map timeline item type to entity type for linking
 */
export function mapTimelineTypeToEntityType(
  type: TimelineItemType
): 'ACTIVITY' | 'TRANSPORTATION' | 'LODGING' | 'JOURNAL_ENTRY' {
  switch (type) {
    case 'activity':
      return 'ACTIVITY';
    case 'transportation':
      return 'TRANSPORTATION';
    case 'lodging':
      return 'LODGING';
    case 'journal':
      return 'JOURNAL_ENTRY';
  }
}
