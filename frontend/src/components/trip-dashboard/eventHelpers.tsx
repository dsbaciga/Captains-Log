/**
 * Event helper components and functions shared between trip dashboard components.
 * Extracted to separate file for React Fast Refresh compatibility.
 */

import type { EventIconType, NormalizedEvent } from '../../utils/tripDashboardUtils';

/**
 * Get the appropriate icon component for an event type
 */
export function EventIcon({ iconType, className }: { iconType: EventIconType; className?: string }) {
  const baseClass = className || 'w-6 h-6';

  switch (iconType) {
    case 'plane':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      );

    case 'train':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 17h8M8 17v4m0-4H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3m0 0v4m-8-4l2 4m6-4l-2 4M9 7h6m-6 4h6"
          />
        </svg>
      );

    case 'bus':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 17h8M6 17V9a2 2 0 012-2h8a2 2 0 012 2v8m-12 0a2 2 0 11-4 0m4 0H6m12 0h2a2 2 0 002-2V9a2 2 0 00-2-2h-2m0 10v-1m-8 1v-1"
          />
        </svg>
      );

    case 'car':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 17h14M5 17l1-6h12l1 6M5 17H4a1 1 0 01-1-1v-1a1 1 0 011-1h1m14 3h1a1 1 0 001-1v-1a1 1 0 00-1-1h-1M7 11h10M7 14h.01M17 14h.01"
          />
        </svg>
      );

    case 'ferry':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 18c0-1 .5-2 2-2h10c1.5 0 2 1 2 2M3 21l1.5-1.5M19.5 19.5L21 21M12 4v8m-4 0h8M8 12l-3 6m11-6l3 6"
          />
        </svg>
      );

    case 'bicycle':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 17a3 3 0 100-6 3 3 0 000 6zm14 0a3 3 0 100-6 3 3 0 000 6zm-7-3l-3-5h3l2 3h3l-2-4h2"
          />
        </svg>
      );

    case 'walk':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 5a2 2 0 100-4 2 2 0 000 4zm-1 3l-2 9 3-2 2 5m0 0l1-4m-1 4l-3-2m6-6l-2-3-3 1-1 3"
          />
        </svg>
      );

    case 'hotel':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      );

    case 'airbnb':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      );

    case 'camping':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3L2 21h20L12 3zm0 4v8m-3 4h6"
          />
        </svg>
      );

    case 'activity':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      );

    default:
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
  }
}

/**
 * Get color classes based on event type
 */
export function getEventTypeColors(type: NormalizedEvent['type']): {
  bg: string;
  text: string;
  border: string;
} {
  switch (type) {
    case 'activity':
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-600 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
      };
    case 'transportation':
      return {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        text: 'text-orange-600 dark:text-orange-400',
        border: 'border-orange-200 dark:border-orange-800',
      };
    case 'lodging':
      return {
        bg: 'bg-rose-50 dark:bg-rose-900/20',
        text: 'text-rose-600 dark:text-rose-400',
        border: 'border-rose-200 dark:border-rose-800',
      };
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-800',
        text: 'text-gray-600 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-700',
      };
  }
}
