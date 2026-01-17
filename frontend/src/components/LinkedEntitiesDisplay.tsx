import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import entityLinkService from '../services/entityLink.service';
import type {
  EntityType,
  EnrichedEntityLink,
  EntityLinksResponse,
} from '../types/entityLink';

interface LinkedEntitiesDisplayProps {
  tripId: number;
  entityType: EntityType;
  entityId: number;
  /** Optional: Exclude certain entity types from display */
  excludeTypes?: EntityType[];
  /** Optional: Compact mode shows fewer details */
  compact?: boolean;
  /** Optional: Maximum number of items to show per type before collapsing */
  maxItemsPerType?: number;
  /** Optional: Custom class name for the container */
  className?: string;
}

// Entity type configuration
const ENTITY_CONFIG: Record<EntityType, { label: string; labelPlural: string; emoji: string; color: string }> = {
  PHOTO: { label: 'Photo', labelPlural: 'Photos', emoji: '📷', color: 'gray' },
  LOCATION: { label: 'Location', labelPlural: 'Locations', emoji: '📍', color: 'blue' },
  ACTIVITY: { label: 'Activity', labelPlural: 'Activities', emoji: '🎯', color: 'green' },
  LODGING: { label: 'Lodging', labelPlural: 'Lodging', emoji: '🏨', color: 'purple' },
  TRANSPORTATION: { label: 'Transportation', labelPlural: 'Transportation', emoji: '🚗', color: 'orange' },
  JOURNAL_ENTRY: { label: 'Journal', labelPlural: 'Journal Entries', emoji: '📝', color: 'yellow' },
  PHOTO_ALBUM: { label: 'Album', labelPlural: 'Albums', emoji: '📸', color: 'pink' },
};

// Get Tailwind color classes for each entity type
function getColorClasses(entityType: EntityType): {
  bg: string;
  bgHover: string;
  text: string;
  border: string;
  ring: string;
} {
  const colorMap: Record<string, { bg: string; bgHover: string; text: string; border: string; ring: string }> = {
    gray: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      bgHover: 'hover:bg-gray-200 dark:hover:bg-gray-600',
      text: 'text-gray-800 dark:text-gray-200',
      border: 'border-gray-300 dark:border-gray-600',
      ring: 'ring-gray-400',
    },
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/50',
      bgHover: 'hover:bg-blue-200 dark:hover:bg-blue-800/50',
      text: 'text-blue-800 dark:text-blue-200',
      border: 'border-blue-300 dark:border-blue-700',
      ring: 'ring-blue-400',
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/50',
      bgHover: 'hover:bg-green-200 dark:hover:bg-green-800/50',
      text: 'text-green-800 dark:text-green-200',
      border: 'border-green-300 dark:border-green-700',
      ring: 'ring-green-400',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/50',
      bgHover: 'hover:bg-purple-200 dark:hover:bg-purple-800/50',
      text: 'text-purple-800 dark:text-purple-200',
      border: 'border-purple-300 dark:border-purple-700',
      ring: 'ring-purple-400',
    },
    orange: {
      bg: 'bg-orange-100 dark:bg-orange-900/50',
      bgHover: 'hover:bg-orange-200 dark:hover:bg-orange-800/50',
      text: 'text-orange-800 dark:text-orange-200',
      border: 'border-orange-300 dark:border-orange-700',
      ring: 'ring-orange-400',
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/50',
      bgHover: 'hover:bg-yellow-200 dark:hover:bg-yellow-800/50',
      text: 'text-yellow-800 dark:text-yellow-200',
      border: 'border-yellow-300 dark:border-yellow-700',
      ring: 'ring-yellow-400',
    },
    pink: {
      bg: 'bg-pink-100 dark:bg-pink-900/50',
      bgHover: 'hover:bg-pink-200 dark:hover:bg-pink-800/50',
      text: 'text-pink-800 dark:text-pink-200',
      border: 'border-pink-300 dark:border-pink-700',
      ring: 'ring-pink-400',
    },
  };
  return colorMap[ENTITY_CONFIG[entityType].color] || colorMap.gray;
}

// Get display name for a linked entity
function getEntityDisplayName(link: EnrichedEntityLink, direction: 'from' | 'to'): string {
  const entity = direction === 'from' ? link.targetEntity : link.sourceEntity;
  if (!entity) return `ID: ${direction === 'from' ? link.targetId : link.sourceId}`;
  return entity.name || entity.title || entity.caption || `ID: ${entity.id}`;
}

// Format relationship for display
function formatRelationship(relationship: string): string {
  return relationship.replace(/_/g, ' ').toLowerCase();
}

interface GroupedLink {
  link: EnrichedEntityLink;
  linkedEntityType: EntityType;
  linkedEntityId: number;
  displayName: string;
  direction: 'from' | 'to';
}

// Map entity types to tab names for navigation
const ENTITY_TYPE_TO_TAB: Record<EntityType, string | null> = {
  PHOTO: 'photos',
  LOCATION: 'locations',
  ACTIVITY: 'activities',
  LODGING: 'lodging',
  TRANSPORTATION: 'transportation',
  JOURNAL_ENTRY: 'journal',
  PHOTO_ALBUM: null, // Albums have their own route
};

// Generate URL for navigating to a linked entity
function getEntityUrl(tripId: number, entityType: EntityType, entityId: number): string {
  if (entityType === 'PHOTO_ALBUM') {
    return `/trips/${tripId}/albums/${entityId}`;
  }
  const tab = ENTITY_TYPE_TO_TAB[entityType];
  if (tab) {
    return `/trips/${tripId}?tab=${tab}`;
  }
  return `/trips/${tripId}`;
}

export default function LinkedEntitiesDisplay({
  tripId,
  entityType,
  entityId,
  excludeTypes = [],
  compact = false,
  maxItemsPerType = 5,
  className = '',
}: LinkedEntitiesDisplayProps) {
  // Fetch all links for this entity
  const {
    data: linksData,
    isLoading,
    error,
  } = useQuery<EntityLinksResponse>({
    queryKey: ['entityLinks', tripId, entityType, entityId],
    queryFn: () => entityLinkService.getAllLinksForEntity(tripId, entityType, entityId),
  });

  // Group links by entity type
  const groupedLinks = useMemo(() => {
    if (!linksData) return {};

    const groups: Record<EntityType, GroupedLink[]> = {
      PHOTO: [],
      LOCATION: [],
      ACTIVITY: [],
      LODGING: [],
      TRANSPORTATION: [],
      JOURNAL_ENTRY: [],
      PHOTO_ALBUM: [],
    };

    // Links FROM this entity (this entity is the source)
    for (const link of linksData.linksFrom) {
      if (!excludeTypes.includes(link.targetType)) {
        groups[link.targetType].push({
          link,
          linkedEntityType: link.targetType,
          linkedEntityId: link.targetId,
          displayName: getEntityDisplayName(link, 'from'),
          direction: 'from',
        });
      }
    }

    // Links TO this entity (this entity is the target)
    for (const link of linksData.linksTo) {
      if (!excludeTypes.includes(link.sourceType)) {
        groups[link.sourceType].push({
          link,
          linkedEntityType: link.sourceType,
          linkedEntityId: link.sourceId,
          displayName: getEntityDisplayName(link, 'to'),
          direction: 'to',
        });
      }
    }

    return groups;
  }, [linksData, excludeTypes]);

  // Get entity types that have links (ordered by preference)
  const linkedEntityTypes = useMemo(() => {
    const preferredOrder: EntityType[] = [
      'LOCATION',
      'ACTIVITY',
      'LODGING',
      'TRANSPORTATION',
      'PHOTO',
      'PHOTO_ALBUM',
      'JOURNAL_ENTRY',
    ];
    return preferredOrder.filter(
      (type) => groupedLinks[type]?.length > 0
    );
  }, [groupedLinks]);

  // Don't render anything if there are no links
  if (!isLoading && linkedEntityTypes.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`mt-3 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="animate-pulse h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="animate-pulse h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return null; // Silently fail - don't break the UI if links can't be loaded
  }

  return (
    <div className={`mt-3 ${className}`}>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Linked Items
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
      </div>

      {/* Linked entity cards by type */}
      <div className="space-y-3">
        {linkedEntityTypes.map((type) => {
          const items = groupedLinks[type];
          const config = ENTITY_CONFIG[type];
          const colors = getColorClasses(type);
          const showAll = items.length <= maxItemsPerType;
          const displayItems = showAll ? items : items.slice(0, maxItemsPerType);
          const hiddenCount = items.length - displayItems.length;

          return (
            <div key={type}>
              {/* Type label with count */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-sm">{config.emoji}</span>
                <span className={`text-xs font-medium ${colors.text}`}>
                  {items.length === 1 ? config.label : config.labelPlural} ({items.length})
                </span>
              </div>

              {/* Cards grid */}
              <div className="flex flex-wrap gap-2">
                {displayItems.map((item) => (
                  <Link
                    key={item.link.id}
                    to={getEntityUrl(tripId, item.linkedEntityType, item.linkedEntityId)}
                    className={`
                      inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border
                      ${colors.bg} ${colors.bgHover} ${colors.border}
                      transition-colors cursor-pointer
                      ${compact ? 'text-xs' : 'text-sm'}
                    `}
                    title={`${formatRelationship(item.link.relationship)}: ${item.displayName}`}
                  >
                    <span className={compact ? 'text-xs' : 'text-sm'}>{config.emoji}</span>
                    <span className={`font-medium ${colors.text} truncate max-w-[150px]`}>
                      {item.displayName}
                    </span>
                    {!compact && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({formatRelationship(item.link.relationship)})
                      </span>
                    )}
                  </Link>
                ))}

                {/* Show "more" indicator if items are truncated */}
                {hiddenCount > 0 && (
                  <div
                    className={`
                      inline-flex items-center px-3 py-1.5 rounded-lg border
                      bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700
                      text-gray-600 dark:text-gray-400
                      ${compact ? 'text-xs' : 'text-sm'}
                    `}
                  >
                    +{hiddenCount} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
