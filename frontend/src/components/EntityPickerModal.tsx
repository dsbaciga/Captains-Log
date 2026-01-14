import { useState, useEffect } from 'react';
import type { EntityType } from '../types/entityLink';
import type { Location } from '../types/location';
import type { Activity } from '../types/activity';
import type { Lodging } from '../types/lodging';
import type { Transportation } from '../types/transportation';
import locationService from '../services/location.service';
import activityService from '../services/activity.service';
import lodgingService from '../services/lodging.service';
import transportationService from '../services/transportation.service';
import entityLinkService from '../services/entityLink.service';
import toast from 'react-hot-toast';

interface EntityPickerModalProps {
  tripId: number;
  photoIds: number[];
  onClose: () => void;
  onSuccess?: () => void;
}

// Entity type configuration
const LINKABLE_ENTITY_TYPES: { type: EntityType; label: string; emoji: string }[] = [
  { type: 'LOCATION', label: 'Location', emoji: '📍' },
  { type: 'ACTIVITY', label: 'Activity', emoji: '🎯' },
  { type: 'LODGING', label: 'Lodging', emoji: '🏨' },
  { type: 'TRANSPORTATION', label: 'Transportation', emoji: '🚗' },
];

type EntityItem = {
  id: number;
  name: string;
  subtitle?: string;
};

export default function EntityPickerModal({
  tripId,
  photoIds,
  onClose,
  onSuccess,
}: EntityPickerModalProps) {
  const [selectedType, setSelectedType] = useState<EntityType | null>(null);
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch entities when type is selected
  useEffect(() => {
    if (!selectedType) {
      setEntities([]);
      return;
    }

    const fetchEntities = async () => {
      setLoading(true);
      try {
        let items: EntityItem[] = [];

        switch (selectedType) {
          case 'LOCATION':
            const locations = await locationService.getByTripId(tripId);
            items = locations.map((loc: Location) => ({
              id: loc.id,
              name: loc.name,
              subtitle: loc.address || undefined,
            }));
            break;

          case 'ACTIVITY':
            const activities = await activityService.getByTripId(tripId);
            items = activities.map((act: Activity) => ({
              id: act.id,
              name: act.name,
              subtitle: act.category || undefined,
            }));
            break;

          case 'LODGING':
            const lodgings = await lodgingService.getByTripId(tripId);
            items = lodgings.map((lod: Lodging) => ({
              id: lod.id,
              name: lod.name,
              subtitle: lod.type,
            }));
            break;

          case 'TRANSPORTATION':
            const transports = await transportationService.getByTripId(tripId);
            items = transports.map((trans: Transportation) => ({
              id: trans.id,
              name: `${trans.type}${trans.company ? ` - ${trans.company}` : ''}`,
              subtitle: trans.startLocationText || trans.startLocation?.name || undefined,
            }));
            break;
        }

        setEntities(items);
      } catch (error) {
        console.error('Failed to fetch entities:', error);
        toast.error('Failed to load items');
      } finally {
        setLoading(false);
      }
    };

    fetchEntities();
  }, [selectedType, tripId]);

  const handleLinkToEntity = async (entityId: number) => {
    if (!selectedType) return;

    setLinking(true);
    try {
      const result = await entityLinkService.bulkLinkPhotos(tripId, {
        photoIds,
        targetType: selectedType,
        targetId: entityId,
      });

      if (result.created > 0) {
        toast.success(`Linked ${result.created} photo${result.created !== 1 ? 's' : ''}`);
      }
      if (result.skipped > 0) {
        toast.success(`${result.skipped} already linked`);
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to link photos:', error);
      toast.error('Failed to link photos');
    } finally {
      setLinking(false);
    }
  };

  // Filter entities by search query
  const filteredEntities = entities.filter(
    (entity) =>
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Link {photoIds.length} Photo{photoIds.length !== 1 ? 's' : ''} to...
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
              {LINKABLE_ENTITY_TYPES.map(({ type, label, emoji }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{label}</span>
                </button>
              ))}
            </div>
          ) : loading ? (
            // Loading State
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : entities.length === 0 ? (
            // Empty State
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                No {selectedType.toLowerCase().replace('_', ' ')}s found in this trip.
              </p>
            </div>
          ) : (
            // Entity Selection
            <>
              {entities.length > 5 && (
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="input mb-3 w-full"
                />
              )}
              <div className="space-y-2">
                {filteredEntities.map((entity) => (
                  <button
                    key={entity.id}
                    onClick={() => handleLinkToEntity(entity.id)}
                    disabled={linking}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left disabled:opacity-50"
                  >
                    <span className="text-lg">
                      {LINKABLE_ENTITY_TYPES.find((t) => t.type === selectedType)?.emoji}
                    </span>
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
                ))}
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
