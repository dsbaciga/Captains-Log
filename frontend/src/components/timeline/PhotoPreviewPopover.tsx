import { useState, useEffect, useRef } from 'react';
import entityLinkService from '../../services/entityLink.service';
import type { EntityType } from '../../types/entityLink';

interface PhotoPreviewPopoverProps {
  tripId: number;
  entityType: EntityType;
  entityId: number;
  photoCount: number;
  children: React.ReactNode;
  onViewAll: () => void;
}

interface LinkedPhoto {
  id: number;
  thumbnailPath?: string;
  caption?: string;
}

export default function PhotoPreviewPopover({
  tripId,
  entityType,
  entityId,
  photoCount,
  children,
  onViewAll,
}: PhotoPreviewPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [photos, setPhotos] = useState<LinkedPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const uploadUrl = import.meta.env.VITE_UPLOAD_URL || 'http://localhost:5000/uploads';

  // Fetch photos when popover opens
  useEffect(() => {
    if (isOpen && photos.length === 0 && !loading) {
      setLoading(true);
      entityLinkService
        .getPhotosForEntity(tripId, entityType, entityId)
        .then((data) => {
          // Map Photo objects to LinkedPhoto format
          setPhotos(
            data.slice(0, 6).map((photo) => ({
              id: photo.id,
              thumbnailPath: photo.thumbnailPath || undefined,
              caption: photo.caption || undefined,
            }))
          );
        })
        .catch((err) => {
          console.error('Failed to fetch linked photos:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, tripId, entityType, entityId, photos.length, loading]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 300); // 300ms delay before showing
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150); // Small delay before hiding
  };

  const handleClick = () => {
    onViewAll();
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div onClick={handleClick} className="cursor-pointer">
        {children}
      </div>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Arrow */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 transform rotate-45" />

          {loading ? (
            <div className="flex items-center justify-center h-20">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : photos.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-1">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded overflow-hidden bg-gray-100 dark:bg-gray-700"
                  >
                    {photo.thumbnailPath ? (
                      <img
                        src={`${uploadUrl}/${photo.thumbnailPath}`}
                        alt={photo.caption || 'Photo'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {photoCount > 6 && (
                <button
                  type="button"
                  onClick={onViewAll}
                  className="mt-2 w-full text-xs text-center text-blue-600 dark:text-blue-400 hover:underline"
                >
                  +{photoCount - 6} more photos
                </button>
              )}
            </>
          ) : (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
              No photos available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
