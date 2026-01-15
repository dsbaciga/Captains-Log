import { Link } from 'react-router-dom';
import { getTimelineItemIcon, EditIcon, DeleteIcon, LocationIcon, HashIcon, CheckCircleIcon, PhotoIcon, MoonIcon, BoltIcon, ChecklistIcon } from './icons';
import {
  formatTime,
  formatDuration,
  formatDistance,
  getTypeColor,
  getTypeBorderColor,
  getTimezoneAbbr,
  mapTimelineTypeToEntityType,
} from './utils';
import EventLinkBar from './EventLinkBar';
import type { TimelineEventCardProps, TimelineItem } from './types';
import type { Activity } from '../../types/activity';
import type { Lodging } from '../../types/lodging';

export default function TimelineEventCard({
  item,
  tripId,
  tripTimezone,
  userTimezone,
  showDualTime,
  linkSummary,
  viewMode,
  connectionInfo,
  showConnectionLine,
  onEdit,
  onDelete,
  onLinkUpdate,
}: TimelineEventCardProps) {
  const isCompact = viewMode === 'compact';
  const entityType = mapTimelineTypeToEntityType(item.type);

  // Get the actual entity ID from the data object
  const actualEntityId = item.data.id;

  // Determine timezone to use for display
  const displayTimezone =
    item.type === 'transportation' && item.startTimezone
      ? item.startTimezone
      : tripTimezone;

  // Format primary time display
  const renderTimeDisplay = () => {
    if (item.isAllDay) {
      return <span className="text-gray-500 dark:text-gray-400">All Day</span>;
    }
    if (item.showCheckInTime) {
      return (
        <span>
          Check-in: {formatTime(item.dateTime, displayTimezone)}
        </span>
      );
    }
    if (item.showCheckOutTime && item.endDateTime) {
      return (
        <span>
          Check-out: {formatTime(item.endDateTime, displayTimezone)}
        </span>
      );
    }

    // Regular time display
    const primaryTime = formatTime(item.dateTime, displayTimezone);
    const endTime = item.endDateTime ? formatTime(item.endDateTime, displayTimezone) : null;

    return (
      <>
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {primaryTime}
          {endTime && ` - ${endTime}`}
        </span>
        {displayTimezone && (
          <span className="text-gray-400 dark:text-gray-500 ml-1">
            {getTimezoneAbbr(displayTimezone)}
          </span>
        )}
        {/* Show secondary timezone inline on desktop */}
        {showDualTime && userTimezone && displayTimezone !== userTimezone && (
          <span className="hidden lg:inline text-gray-400 dark:text-gray-500 ml-2">
            ({formatTime(item.dateTime, userTimezone)} {getTimezoneAbbr(userTimezone)})
          </span>
        )}
      </>
    );
  };

  // Render duration/distance info
  const renderDurationDistance = () => {
    const parts: string[] = [];
    if (item.durationMinutes && item.durationMinutes > 0) {
      parts.push(formatDuration(item.durationMinutes));
    }
    if (item.distanceKm) {
      parts.push(formatDistance(item.distanceKm));
    }
    if (parts.length === 0) return null;
    return (
      <span className="text-gray-400 dark:text-gray-500">
        {' '}· {parts.join(' · ')}
      </span>
    );
  };

  // Get address from data object
  const getAddress = (): string | null => {
    if (item.type === 'activity') {
      return (item.data as Activity).location?.address || null;
    }
    if (item.type === 'lodging') {
      return (item.data as Lodging).location?.address || null;
    }
    return null;
  };

  const address = getAddress();

  return (
    <div className="timeline-item relative flex gap-3">
      {/* Connection line to next item */}
      {showConnectionLine && (
        <div className="absolute left-5 top-10 h-full w-0.5 border-l-2 border-dashed border-green-400 dark:border-green-500 z-0" />
      )}

      {/* Icon dot */}
      <div
        className={`flex-shrink-0 ${isCompact ? 'w-10 h-10' : 'w-11 h-11'} rounded-full ${getTypeColor(
          item.type
        )} text-white flex items-center justify-center z-10 shadow-md ${
          connectionInfo ? 'ring-2 ring-green-400 dark:ring-green-500' : ''
        }`}
      >
        {getTimelineItemIcon(item, isCompact ? 'w-4 h-4' : 'w-5 h-5')}
      </div>

      {/* Content card */}
      <div
        className={`group flex-1 bg-white dark:bg-gray-800 border-l-4 ${getTypeBorderColor(
          item.type
        )} rounded-lg ${isCompact ? 'p-2.5' : 'p-4'} shadow-sm hover:shadow-md transition-shadow relative border border-gray-200 dark:border-gray-700 border-l-4 ${
          connectionInfo ? 'ring-1 ring-green-200 dark:ring-green-800' : ''
        }`}
      >
        {/* Quick action buttons - appear on hover */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 print:hidden">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
            title="Edit"
          >
            <EditIcon />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
            title="Delete"
          >
            <DeleteIcon />
          </button>
        </div>

        {/* Time row */}
        <div className={`text-sm text-gray-500 dark:text-gray-400 ${isCompact ? 'mb-1' : 'mb-2'} pr-16`}>
          {renderTimeDisplay()}
          {renderDurationDistance()}
        </div>

        {/* Title and subtitle */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className={`font-semibold text-gray-900 dark:text-white ${isCompact ? 'text-sm' : ''}`}>
              {item.title}
            </h4>
            {item.subtitle && (
              <p className={`text-gray-600 dark:text-gray-400 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                {item.subtitle}
              </p>
            )}
          </div>
          {/* Cost */}
          {item.cost !== undefined && item.cost > 0 && item.currency && (
            <div className={`font-medium text-gray-700 dark:text-gray-300 ${isCompact ? 'text-xs' : 'text-sm'}`}>
              {item.currency} {item.cost.toFixed(2)}
            </div>
          )}
        </div>

        {/* Booking info */}
        {(item.vehicleNumber || item.confirmationNumber) && (
          <div className={`flex items-center gap-3 text-gray-500 dark:text-gray-500 font-mono ${isCompact ? 'mt-1 text-xs' : 'mt-2 text-xs'}`}>
            {item.vehicleNumber && (
              <span className="inline-flex items-center gap-1">
                <HashIcon />
                {item.vehicleNumber}
              </span>
            )}
            {item.confirmationNumber && (
              <span className="inline-flex items-center gap-1">
                <CheckCircleIcon />
                {item.confirmationNumber}
              </span>
            )}
          </div>
        )}

        {/* Location */}
        {item.location && (
          <div className={`flex items-start gap-1.5 text-gray-600 dark:text-gray-400 ${isCompact ? 'mt-1.5 text-xs' : 'mt-2 text-sm'}`}>
            <LocationIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <div>{item.location}</div>
              {address && (
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                  {address}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description (for transportation shows route, for others shows description) */}
        {item.description && !isCompact && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Badges row */}
        <div className={`flex flex-wrap items-center gap-2 ${isCompact ? 'mt-2' : 'mt-3'}`}>
          {/* Connection badge */}
          {connectionInfo && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 dark:bg-green-900/30 text-xs font-medium text-green-700 dark:text-green-300">
              <BoltIcon />
              Leg {connectionInfo.legNumber}/{connectionInfo.totalLegs}
            </span>
          )}

          {/* Multi-day stay badge */}
          {item.multiDayInfo && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-xs font-medium text-purple-700 dark:text-purple-300">
              <MoonIcon />
              Night {item.multiDayInfo.nightNumber}/{item.multiDayInfo.totalNights}
            </span>
          )}

          {/* Photo albums */}
          {item.photoAlbums && item.photoAlbums.length > 0 && (
            <>
              {item.photoAlbums.slice(0, 2).map((album) => (
                <Link
                  key={album.id}
                  to={`/trips/${tripId}/albums/${album.id}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <PhotoIcon />
                  <span className="truncate max-w-[80px]">{album.name}</span>
                  {album._count?.photoAssignments !== undefined && (
                    <span className="text-gray-400 dark:text-gray-500">
                      ({album._count.photoAssignments})
                    </span>
                  )}
                </Link>
              ))}
              {item.photoAlbums.length > 2 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{item.photoAlbums.length - 2} more
                </span>
              )}
            </>
          )}
        </div>

        {/* Child activities (for parent activities) */}
        {item.type === 'activity' && renderChildActivities(item, isCompact, tripTimezone)}

        {/* Entity link bar */}
        <div className={`border-t border-gray-100 dark:border-gray-700 ${isCompact ? 'mt-2 pt-2' : 'mt-3 pt-3'}`}>
          <EventLinkBar
            tripId={tripId}
            entityType={entityType}
            entityId={actualEntityId}
            linkSummary={linkSummary}
            onUpdate={onLinkUpdate}
            compact={isCompact}
          />
        </div>
      </div>
    </div>
  );
}

// Render child activities for parent activity items
function renderChildActivities(
  item: TimelineItem,
  isCompact: boolean,
  timezone?: string
): React.ReactNode {
  if (item.type !== 'activity') return null;
  const activity = item.data as Activity;
  if (!activity.children || activity.children.length === 0) return null;

  return (
    <div className={`border-t border-gray-200 dark:border-gray-700 ${isCompact ? 'mt-2 pt-2' : 'mt-3 pt-3'}`}>
      <div className="flex items-center gap-2 mb-2">
        <ChecklistIcon className="w-4 h-4 text-blue-500" />
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Sub-activities ({activity.children.length})
        </span>
      </div>
      <div className="space-y-2">
        {activity.children.slice(0, 3).map((child) => {
          let childDuration: string | null = null;
          if (child.startTime && child.endTime) {
            const start = new Date(child.startTime);
            const end = new Date(child.endTime);
            const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
            childDuration = formatDuration(minutes);
          }

          return (
            <div
              key={child.id}
              className="text-sm bg-blue-50 dark:bg-blue-900/20 rounded p-2 border-l-2 border-blue-400 dark:border-blue-500"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {child.name}
                </span>
                {child.startTime && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(new Date(child.startTime), timezone)}
                    {childDuration && ` · ${childDuration}`}
                  </span>
                )}
              </div>
              {child.category && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {child.category}
                </span>
              )}
            </div>
          );
        })}
        {activity.children.length > 3 && (
          <div className="text-xs text-gray-500 dark:text-gray-400 pl-2">
            +{activity.children.length - 3} more sub-activities
          </div>
        )}
      </div>
    </div>
  );
}
