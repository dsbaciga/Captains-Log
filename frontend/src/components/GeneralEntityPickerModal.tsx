import { useState, useMemo } from 'react';
import type { EntityType } from '../types/entityLink';
import { ENTITY_TYPE_CONFIG } from '../types/entityLink';
import { useEntityFetcher, useEntityFilter } from '../hooks/useEntityFetcher';
import entityLinkService from '../services/entityLink.service';
import toast from 'react-hot-toast';

interface GeneralEntityPickerModalProps {
  tripId: number;
  sourceEntityType: EntityType;
  sourceEntityId: number;
  existingLinksByType?: Map<EntityType, Set<number>>; // IDs of already-linked entities grouped by type
  onClose: () => void;
  onSuccess?: () => void;
}

// Entity types that can be linked (excludes PHOTO_ALBUM as it's a container, not a linkable destination)
const LINKABLE_ENTITY_TYPES: EntityType[] = [
  'PHOTO',
  'LOCATION',
  'ACTIVITY',
  'LODGING',
  'TRANSPORTATION',
  'JOURNAL_ENTRY',
];

export default function GeneralEntityPickerModal({
  tripId,
  sourceEntityType,
  sourceEntityId,
  existingLinksByType = new Map(),
  onClose,
  onSuccess,
}: GeneralEntityPickerModalProps) {
  const [selectedType, setSelectedType] = useState<EntityType | null>(null);
  const [linking, setLinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Use shared hook for entity fetching
  const { entities, loading } = useEntityFetcher(tripId, selectedType);

  // Filter out the source entity itself and already-linked entities
  const availableEntities = useMemo(() => {
    return entities.filter((entity) => {
      // Don't show the source entity itself
      if (selectedType === sourceEntityType && entity.id === sourceEntityId) {
        return false;
      }
      // Don't show already-linked entities of the selected type
      if (selectedType && existingLinksByType.get(selectedType)?.has(entity.id)) {
        return false;
      }
      return true;
    });
  }, [entities, selectedType, sourceEntityType, sourceEntityId, existingLinksByType]);

  // Apply search filter to available entities
  const filteredEntities = useEntityFilter(availableEntities, searchQuery);

  const handleLinkToEntity = async (targetEntityId: number) => {
    if (!selectedType) return;

    setLinking(true);
    try {
      await entityLinkService.createLink(tripId, {
        sourceType: sourceEntityType,
        sourceId: sourceEntityId,
        targetType: selectedType,
        targetId: targetEntityId,
      });

      toast.success('Link created');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to create link:', error);
      toast.error('Failed to create link');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Link to...
            </h3>
            {selectedType && (
              <button
                onClick={() => {
                  setSelectedType(null);
                  setSearchQuery('');
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                ← Back to types
              </button>
            )}
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
          {!selectedType ? (
            // Entity Type Selection
            <div className="grid grid-cols-2 gap-3">
              {LINKABLE_ENTITY_TYPES.map((type) => {
                const config = ENTITY_TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <span className="text-2xl">{config.emoji}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{config.label}</span>
                  </button>
                );
              })}
            </div>
          ) : loading ? (
            // Loading State
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : availableEntities.length === 0 ? (
            // Empty State
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                No available {selectedType.toLowerCase().replace('_', ' ')}s to link.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                All items may already be linked or none exist yet.
              </p>
            </div>
          ) : (
            // Entity Selection
            <>
              {availableEntities.length > 5 && (
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="input mb-3 w-full"
                />
              )}
              <div className="space-y-2">
                {filteredEntities.map((entity) => {
                  const isPhoto = selectedType === 'PHOTO';
                  return (
                    <button
                      key={entity.id}
                      onClick={() => handleLinkToEntity(entity.id)}
                      disabled={linking}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left disabled:opacity-50"
                    >
                      {/* Show thumbnail for photos, emoji for others */}
                      {isPhoto && entity.thumbnailPath ? (
                        <img
                          src={entity.thumbnailPath}
                          alt={entity.name}
                          className="w-12 h-12 object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <span className="text-lg">
                          {selectedType && ENTITY_TYPE_CONFIG[selectedType].emoji}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {entity.name}
                        </div>
                        {entity.subtitle && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {entity.subtitle}
                          </div>
                        )}
                      </div>
                      {linking && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      )}
                    </button>
                  );
                })}
                {filteredEntities.length === 0 && searchQuery && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                    No matches for "{searchQuery}"
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="btn btn-secondary w-full">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
