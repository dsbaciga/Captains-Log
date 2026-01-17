import { useMemo } from 'react';
import DayHeader from './DayHeader';
import TimelineEventCard from './TimelineEventCard';
import DayMiniMap from '../DayMiniMap';
import { getConnectionInfo, getTimezoneAbbr } from './utils';
import type { DayGroup, TimelineItem } from './types';
import type { EntityLinkSummary, EntityType } from '../../types/entityLink';
import { getEntityKey } from '../../types/entityLink';

interface TimelineDaySectionProps {
  dayGroup: DayGroup;
  tripId: number;
  tripTimezone?: string;
  userTimezone?: string;
  viewMode: 'standard' | 'compact';
  isCollapsed: boolean;
  showDualTimezone: boolean;
  linkSummaryMap?: Record<string, EntityLinkSummary>;
  onToggleCollapse: () => void;
  onEdit: (item: TimelineItem) => void;
  onDelete: (item: TimelineItem) => void;
  onLinkUpdate: () => void;
}

// Map timeline type to entity type
function mapTimelineTypeToEntityType(
  type: 'activity' | 'transportation' | 'lodging' | 'journal'
): EntityType {
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

export default function TimelineDaySection({
  dayGroup,
  tripId,
  tripTimezone,
  userTimezone,
  viewMode,
  isCollapsed,
  showDualTimezone,
  linkSummaryMap,
  onToggleCollapse,
  onEdit,
  onDelete,
  onLinkUpdate,
}: TimelineDaySectionProps) {
  const { dateKey, items = [], weather, stats } = dayGroup;

  // Sort items by time
  const sortedItems = useMemo(() => {
    // Defensive check: ensure items is an array
    if (!Array.isArray(items)) {
      console.warn('TimelineDaySection: items is not an array', { dateKey, items });
      return [];
    }
    return [...items].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  }, [items, dateKey]);

  // Get coordinates for mini map
  const mapLocations = useMemo(() => {
    const coords: { latitude: number; longitude: number; name: string }[] = [];

    sortedItems.forEach((item) => {
      if (item.locationCoords) {
        coords.push({
          ...item.locationCoords,
          name: item.title,
        });
      }
      // For transportation, include from/to coords
      if (item.type === 'transportation') {
        if (item.fromCoords) {
          coords.push({
            ...item.fromCoords,
            name: 'Departure',
          });
        }
        if (item.toCoords) {
          coords.push({
            ...item.toCoords,
            name: 'Arrival',
          });
        }
      }
    });

    return coords;
  }, [sortedItems]);

  // Get link summary for an item
  const getLinkSummary = (item: TimelineItem): EntityLinkSummary | undefined => {
    if (!linkSummaryMap) return undefined;
    const entityType = mapTimelineTypeToEntityType(item.type);
    const key = getEntityKey(entityType, item.data.id);
    return linkSummaryMap[key];
  };

  // Determine which timezone to display based on device and setting
  const getDisplayTimezone = (item: TimelineItem): string | undefined => {
    // On mobile, use the active timezone toggle
    // On desktop with dual timezone, times are shown in both
    if (!showDualTimezone) {
      return tripTimezone;
    }

    // For transportation, respect its own timezone
    if (item.type === 'transportation' && item.startTimezone) {
      return item.startTimezone;
    }

    return tripTimezone;
  };

  const isCompact = viewMode === 'compact';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
      {/* Day Header */}
      <DayHeader
        date={dateKey}
        dayNumber={dayGroup.dayNumber}
        tripTimezone={tripTimezone}
        userTimezone={userTimezone}
        weather={weather}
        stats={stats}
        eventCount={items.length}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />

      {/* Day Content - collapsible */}
      <div className={`${isCompact ? 'p-3' : 'p-4'} ${isCollapsed ? 'hidden print:block' : ''}`}>
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">No events scheduled for this day</p>
          </div>
        ) : (
          <>
            {/* Desktop: Dual timezone header row */}
            {showDualTimezone && (
              <div className="hidden lg:flex items-center gap-3 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                {/* Spacer to match icon column width */}
                <div className="w-11 shrink-0" />
                {/* Header row aligned with content card */}
                <div className="flex-1 flex">
                  <div className="w-32 text-left">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Trip Time ({tripTimezone && getTimezoneAbbr(tripTimezone)})
                    </span>
                  </div>
                  <div className="w-32 text-left">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Home Time ({userTimezone && getTimezoneAbbr(userTimezone)})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline vertical line container */}
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

              {/* Events list */}
              <div className={isCompact ? 'space-y-3' : 'space-y-4'}>
                {sortedItems.map((item, index) => {
                  const connectionInfo = getConnectionInfo(item, sortedItems);
                  const nextItem = sortedItems[index + 1];
                  const showConnectionLine =
                    connectionInfo &&
                    !connectionInfo.isLast &&
                    nextItem?.connectionGroupId === item.connectionGroupId;

                  return (
                    <TimelineEventCard
                      key={`${item.type}-${item.id}`}
                      item={item}
                      tripId={tripId}
                      tripTimezone={getDisplayTimezone(item)}
                      userTimezone={userTimezone}
                      showDualTime={showDualTimezone}
                      linkSummary={getLinkSummary(item)}
                      viewMode={viewMode}
                      connectionInfo={connectionInfo || undefined}
                      showConnectionLine={showConnectionLine}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onLinkUpdate={onLinkUpdate}
                    />
                  );
                })}
              </div>
            </div>

            {/* Mini Map */}
            {mapLocations.length > 0 && (
              <div className={`${isCompact ? 'mt-3' : 'mt-4'} border-t border-gray-200 dark:border-gray-700 pt-4`}>
                <DayMiniMap locations={mapLocations} defaultExpanded={viewMode === 'standard'} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
