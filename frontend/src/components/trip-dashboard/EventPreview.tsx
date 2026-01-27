/**
 * EventPreview Component
 *
 * Displays a preview of any event type (activity, transport, lodging)
 * with consistent styling and appropriate icons based on event type.
 */

import { ChevronRightIcon, MapPinIcon } from '../icons';
import type { EventIconType, NormalizedEvent } from '../../utils/tripDashboardUtils';
import {
  formatNextUpEventDateTime,
  getRelativeTimeIndicator,
} from '../../utils/tripDashboardUtils';

interface EventPreviewProps {
  event: NormalizedEvent;
  tripTimezone?: string | null;
  onNavigate?: () => void;
  showRelativeTime?: boolean;
  compact?: boolean;
}

/**
 * Get the appropriate icon component for an event type
 */
function EventIcon({ iconType, className }: { iconType: EventIconType; className?: string }) {
  const baseClass = className || 'w-6 h-6';

  switch (iconType) {
    case 'plane':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a3 3 0 11-6 0 3 3 0 016 0zM12 11v3m0 0l-2 6m2-6l2 6m-4-3h4"
          />
        </svg>
      );

    case 'hotel':
    case 'hostel':
    case 'resort':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      );

    case 'airbnb':
    case 'home':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 21l8-16 8 16H4zm8-10v6m-3 4h6"
          />
        </svg>
      );

    case 'activity':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      );

    case 'other':
    default:
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
function getEventTypeColors(type: NormalizedEvent['type']): {
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

export default function EventPreview({
  event,
  tripTimezone,
  onNavigate,
  showRelativeTime = true,
  compact = false,
}: EventPreviewProps) {
  const colors = getEventTypeColors(event.type);
  const effectiveTimezone = event.timezone || tripTimezone || null;

  const formattedDateTime = formatNextUpEventDateTime(
    event.dateTime,
    effectiveTimezone,
    { includeDate: true, includeTime: true }
  );

  const relativeTime = showRelativeTime
    ? getRelativeTimeIndicator(event.dateTime, effectiveTimezone)
    : null;

  const handleClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className={`
          w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200
          ${colors.bg} ${colors.border}
          hover:shadow-md hover:-translate-y-0.5
          focus-visible:ring-2 focus-visible:ring-primary-500/50 dark:focus-visible:ring-gold/50
        `}
      >
        <div className={`flex-shrink-0 ${colors.text}`}>
          <EventIcon iconType={event.icon} className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {event.title}
          </p>
          {event.dateTime && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {relativeTime || formattedDateTime}
            </p>
          )}
        </div>
        <ChevronRightIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`
        w-full p-4 rounded-xl border transition-all duration-200
        bg-white dark:bg-navy-800/50 border-gray-200 dark:border-gold/20
        hover:shadow-lg hover:-translate-y-0.5 dark:hover:shadow-glow-gold-sm
        focus-visible:ring-2 focus-visible:ring-primary-500/50 dark:focus-visible:ring-gold/50
        text-left
      `}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`
            flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
            ${colors.bg} ${colors.text}
          `}
        >
          <EventIcon iconType={event.icon} className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title and Subtitle */}
          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
            {event.title}
          </h4>
          {event.subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {event.subtitle}
            </p>
          )}

          {/* Date/Time */}
          {event.dateTime && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {formattedDateTime}
              </span>
              {relativeTime && (
                <span
                  className={`
                    text-xs px-2 py-0.5 rounded-full font-medium
                    ${colors.bg} ${colors.text}
                  `}
                >
                  {relativeTime}
                </span>
              )}
            </div>
          )}

          {/* Location */}
          {event.locationName && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <MapPinIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{event.locationName}</span>
            </div>
          )}
        </div>

        {/* Navigate arrow */}
        <div className="flex-shrink-0 self-center">
          <ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>
      </div>
    </button>
  );
}

export { EventIcon, getEventTypeColors };
