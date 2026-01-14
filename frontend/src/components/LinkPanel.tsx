import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import entityLinkService from '../services/entityLink.service';
import type {
  EntityType,
  EnrichedEntityLink,
  EntityLinksResponse,
  ENTITY_TYPE_CONFIG,
} from '../types/entityLink';

interface LinkPanelProps {
  tripId: number;
  entityType: EntityType;
  entityId: number;
  onClose: () => void;
  onUpdate?: () => void;
}

// Entity type configuration
const ENTITY_CONFIG: Record<EntityType, { label: string; emoji: string; color: string }> = {
  PHOTO: { label: 'Photos', emoji: '📷', color: 'gray' },
  LOCATION: { label: 'Locations', emoji: '📍', color: 'blue' },
  ACTIVITY: { label: 'Activities', emoji: '🎯', color: 'green' },
  LODGING: { label: 'Lodging', emoji: '🏨', color: 'purple' },
  TRANSPORTATION: { label: 'Transportation', emoji: '🚗', color: 'orange' },
  JOURNAL_ENTRY: { label: 'Journal Entries', emoji: '📝', color: 'yellow' },
  PHOTO_ALBUM: { label: 'Albums', emoji: '📸', color: 'pink' },
};

// Get color classes for an entity type
function getColorClasses(entityType: EntityType): {
  bg: string;
  bgDark: string;
  text: string;
  textDark: string;
  border: string;
} {
  const colorMap: Record<string, { bg: string; bgDark: string; text: string; textDark: string; border: string }> = {
    gray: {
      bg: 'bg-gray-100',
      bgDark: 'dark:bg-gray-700',
      text: 'text-gray-800',
      textDark: 'dark:text-gray-200',
      border: 'border-gray-300 dark:border-gray-600',
    },
    blue: {
      bg: 'bg-blue-100',
      bgDark: 'dark:bg-blue-900',
      text: 'text-blue-800',
      textDark: 'dark:text-blue-200',
      border: 'border-blue-300 dark:border-blue-700',
    },
    green: {
      bg: 'bg-green-100',
      bgDark: 'dark:bg-green-900',
      text: 'text-green-800',
      textDark: 'dark:text-green-200',
      border: 'border-green-300 dark:border-green-700',
    },
    purple: {
      bg: 'bg-purple-100',
      bgDark: 'dark:bg-purple-900',
      text: 'text-purple-800',
      textDark: 'dark:text-purple-200',
      border: 'border-purple-300 dark:border-purple-700',
    },
    orange: {
      bg: 'bg-orange-100',
      bgDark: 'dark:bg-orange-900',
      text: 'text-orange-800',
      textDark: 'dark:text-orange-200',
      border: 'border-orange-300 dark:border-orange-700',
    },
    yellow: {
      bg: 'bg-yellow-100',
      bgDark: 'dark:bg-yellow-900',
      text: 'text-yellow-800',
      textDark: 'dark:text-yellow-200',
      border: 'border-yellow-300 dark:border-yellow-700',
    },
    pink: {
      bg: 'bg-pink-100',
      bgDark: 'dark:bg-pink-900',
      text: 'text-pink-800',
      textDark: 'dark:text-pink-200',
      border: 'border-pink-300 dark:border-pink-700',
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

export default function LinkPanel({
  tripId,
  entityType,
  entityId,
  onClose,
  onUpdate,
}: LinkPanelProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'linked' | 'add'>('linked');

  // Fetch all links for this entity
  const {
    data: linksData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['entityLinks', tripId, entityType, entityId],
    queryFn: () => entityLinkService.getAllLinksForEntity(tripId, entityType, entityId),
  });

  // Delete link mutation
  const deleteLinkMutation = useMutation({
    mutationFn: (linkId: number) => entityLinkService.deleteLinkById(tripId, linkId),
    onSuccess: () => {
      refetch();
      onUpdate?.();
    },
  });

  // Group links by entity type
  const groupedLinks = useMemo(() => {
    if (!linksData) return {};

    const groups: Record<EntityType, EnrichedEntityLink[]> = {
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
      groups[link.targetType].push(link);
    }

    // Links TO this entity (this entity is the target)
    for (const link of linksData.linksTo) {
      groups[link.sourceType].push(link);
    }

    return groups;
  }, [linksData]);

  // Get entity types that have links
  const linkedEntityTypes = useMemo(() => {
    return (Object.keys(groupedLinks) as EntityType[]).filter(
      (type) => groupedLinks[type]?.length > 0
    );
  }, [groupedLinks]);

  const handleDeleteLink = async (linkId: number) => {
    if (window.confirm('Remove this link?')) {
      deleteLinkMutation.mutate(linkId);
    }
  };

  const currentEntityConfig = ENTITY_CONFIG[entityType];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentEntityConfig.emoji} Links
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {linksData?.summary.totalLinks ?? 0} linked items
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 dark:text-red-400 text-center py-8">
              Failed to load links. Please try again.
            </div>
          ) : linkedEntityTypes.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🔗</div>
              <p className="text-gray-600 dark:text-gray-400">
                No linked items yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Links will appear here when you connect this item to photos, locations, or other entities.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {linkedEntityTypes.map((type) => {
                const links = groupedLinks[type];
                const config = ENTITY_CONFIG[type];
                const colors = getColorClasses(type);

                return (
                  <div key={type}>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <span>{config.emoji}</span>
                      <span>{config.label}</span>
                      <span className="text-gray-500">({links.length})</span>
                    </h4>
                    <div className="space-y-2">
                      {links.map((link) => {
                        // Determine if this entity is source or target
                        const isSource = link.sourceType === entityType && link.sourceId === entityId;
                        const linkedEntityType = isSource ? link.targetType : link.sourceType;
                        const displayName = getEntityDisplayName(link, isSource ? 'from' : 'to');

                        return (
                          <div
                            key={link.id}
                            className={`flex items-center justify-between p-3 rounded-lg ${colors.bg} ${colors.bgDark} border ${colors.border}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-lg flex-shrink-0">
                                {ENTITY_CONFIG[linkedEntityType].emoji}
                              </span>
                              <div className="min-w-0">
                                <div className={`font-medium truncate ${colors.text} ${colors.textDark}`}>
                                  {displayName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {link.relationship.replace(/_/g, ' ').toLowerCase()}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteLink(link.id)}
                              disabled={deleteLinkMutation.isPending}
                              className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors flex-shrink-0"
                              title="Remove link"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="btn btn-secondary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
