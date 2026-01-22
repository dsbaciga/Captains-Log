import type { Activity } from '../../types/activity';
import type { Transportation } from '../../types/transportation';
import type { Lodging } from '../../types/lodging';
import type { JournalEntry } from '../../types/journalEntry';

/**
 * Format time for display
 */
export function formatTime(dateTime: Date | string, timezone?: string): string {
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  });
}

/**
 * Format date for display
 */
export function formatDate(dateTime: Date | string, timezone?: string): string {
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  });
}

/**
 * Format duration in minutes to human readable
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get timezone abbreviation
 */
export function getTimezoneAbbr(timezone?: string): string {
  if (!timezone) return '';
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    return tzPart?.value || timezone;
  } catch {
    return timezone;
  }
}

/**
 * Get type-specific colors
 */
export function getTypeColors(type: 'activity' | 'transportation' | 'lodging' | 'journal' | 'location') {
  switch (type) {
    case 'activity':
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        accent: 'border-l-green-500',
        icon: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        text: 'text-green-700 dark:text-green-300',
      };
    case 'transportation':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        accent: 'border-l-blue-500',
        icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        text: 'text-blue-700 dark:text-blue-300',
      };
    case 'lodging':
      return {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800',
        accent: 'border-l-purple-500',
        icon: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
        text: 'text-purple-700 dark:text-purple-300',
      };
    case 'journal':
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        accent: 'border-l-amber-500',
        icon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
        text: 'text-amber-700 dark:text-amber-300',
      };
    case 'location':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        accent: 'border-l-red-500',
        icon: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
        text: 'text-red-700 dark:text-red-300',
      };
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-900/20',
        border: 'border-gray-200 dark:border-gray-700',
        accent: 'border-l-gray-500',
        icon: 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400',
        text: 'text-gray-700 dark:text-gray-300',
      };
  }
}

/**
 * Get transportation type icon
 */
export function getTransportationIcon(type: string): string {
  switch (type) {
    case 'flight':
      return '✈️';
    case 'train':
      return '🚂';
    case 'bus':
      return '🚌';
    case 'car':
      return '🚗';
    case 'ferry':
      return '⛴️';
    case 'bicycle':
      return '🚲';
    case 'walk':
      return '🚶';
    default:
      return '🚐';
  }
}

/**
 * Get lodging type icon
 */
export function getLodgingIcon(type: string): string {
  switch (type) {
    case 'hotel':
      return '🏨';
    case 'hostel':
      return '🛏️';
    case 'airbnb':
      return '🏠';
    case 'vacation_rental':
      return '🏡';
    case 'camping':
      return '⛺';
    case 'resort':
      return '🏝️';
    case 'motel':
      return '🚗';
    case 'bed_and_breakfast':
      return '🍳';
    case 'apartment':
      return '🏢';
    case 'friends_family':
      return '👨‍👩‍👧‍👦';
    default:
      return '🏠';
  }
}

/**
 * Get activity category icon
 */
export function getActivityIcon(category?: string | null): string {
  if (!category) return '📋';
  const categoryLower = category.toLowerCase();

  if (categoryLower.includes('food') || categoryLower.includes('restaurant') || categoryLower.includes('dining')) {
    return '🍽️';
  }
  if (categoryLower.includes('tour') || categoryLower.includes('sightseeing')) {
    return '🗺️';
  }
  if (categoryLower.includes('museum') || categoryLower.includes('gallery') || categoryLower.includes('art')) {
    return '🎨';
  }
  if (categoryLower.includes('shopping')) {
    return '🛍️';
  }
  if (categoryLower.includes('beach') || categoryLower.includes('swim')) {
    return '🏖️';
  }
  if (categoryLower.includes('hike') || categoryLower.includes('nature') || categoryLower.includes('outdoor')) {
    return '🥾';
  }
  if (categoryLower.includes('entertainment') || categoryLower.includes('show') || categoryLower.includes('concert')) {
    return '🎭';
  }
  if (categoryLower.includes('sport') || categoryLower.includes('adventure')) {
    return '🎯';
  }
  if (categoryLower.includes('relax') || categoryLower.includes('spa')) {
    return '💆';
  }

  return '📋';
}

/**
 * Journal mood to emoji
 */
export function getMoodEmoji(mood?: string | null): string {
  if (!mood) return '';
  switch (mood.toLowerCase()) {
    case 'happy':
    case 'excited':
    case 'joyful':
      return '😊';
    case 'peaceful':
    case 'calm':
    case 'relaxed':
      return '😌';
    case 'adventurous':
    case 'thrilled':
      return '🤩';
    case 'tired':
    case 'exhausted':
      return '😴';
    case 'frustrated':
    case 'annoyed':
      return '😤';
    case 'sad':
    case 'melancholy':
      return '😢';
    case 'grateful':
    case 'thankful':
      return '🙏';
    case 'nostalgic':
      return '🥹';
    default:
      return '📝';
  }
}

/**
 * Type guards
 */
export function isActivity(item: Activity | Transportation | Lodging | JournalEntry): item is Activity {
  return 'name' in item && 'allDay' in item;
}

export function isTransportation(item: Activity | Transportation | Lodging | JournalEntry): item is Transportation {
  return 'type' in item && 'fromLocationId' in item;
}

export function isLodging(item: Activity | Transportation | Lodging | JournalEntry): item is Lodging {
  return 'type' in item && 'checkInDate' in item;
}

export function isJournalEntry(item: Activity | Transportation | Lodging | JournalEntry): item is JournalEntry {
  return 'content' in item && 'entryType' in item;
}
