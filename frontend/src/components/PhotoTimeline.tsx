import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Photo } from '../types/photo';
import photoService from '../services/photo.service';
import { getDateStringInTimezone, formatTime } from './timeline/utils';
import { getFullAssetUrl } from '../lib/config';
import PhotoLightbox from './PhotoLightbox';

interface PhotoTimelineProps {
  tripId: number;
  tripTimezone?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  onPhotoUpdated?: () => void;
}

interface PhotoDayGroup {
  dateKey: string;
  dayNumber: number | null;
  photos: Photo[];
}

export default function PhotoTimeline({
  tripId,
  tripTimezone,
  tripStartDate,
}: PhotoTimelineProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  // Load all photos for the trip
  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all photos sorted by date
      let allPhotos: Photo[] = [];
      let hasMore = true;
      let skip = 0;
      const take = 100;

      while (hasMore) {
        const result = await photoService.getPhotosByTrip(tripId, {
          skip,
          take,
          sortBy: 'date',
          sortOrder: 'asc',
        });
        allPhotos = [...allPhotos, ...result.photos];
        hasMore = result.hasMore;
        skip += take;

        // Safety limit
        if (allPhotos.length > 5000) break;
      }

      // Filter to only photos with takenAt date
      const photosWithDate = allPhotos.filter((p) => p.takenAt);
      setPhotos(photosWithDate);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Get day number from trip start date
  const getDayNumber = (dateString: string): number | null => {
    if (!tripStartDate) return null;

    const match = tripStartDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    let startDate: Date;
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      startDate = new Date(year, month, day, 0, 0, 0, 0);
    } else {
      startDate = new Date(tripStartDate);
      startDate.setHours(0, 0, 0, 0);
    }

    const itemDate = new Date(dateString);
    itemDate.setHours(0, 0, 0, 0);

    const diffTime = itemDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  // Group photos by day
  const dayGroups = useMemo(() => {
    const grouped: Record<string, Photo[]> = {};

    photos.forEach((photo) => {
      if (!photo.takenAt) return;

      const photoDate = new Date(photo.takenAt);
      const dateKey = getDateStringInTimezone(photoDate, tripTimezone);

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(photo);
    });

    // Sort photos within each day by time (photos without time first, then by time)
    Object.keys(grouped).forEach((dateKey) => {
      grouped[dateKey].sort((a, b) => {
        const aDate = new Date(a.takenAt!);
        const bDate = new Date(b.takenAt!);

        // Check if time is midnight (likely no time recorded)
        const aHasTime = aDate.getHours() !== 0 || aDate.getMinutes() !== 0;
        const bHasTime = bDate.getHours() !== 0 || bDate.getMinutes() !== 0;

        // Photos without time come first
        if (!aHasTime && bHasTime) return -1;
        if (aHasTime && !bHasTime) return 1;

        // Both have time or both don't - sort by date
        return aDate.getTime() - bDate.getTime();
      });
    });

    // Sort days chronologically and create day groups
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    const groups: PhotoDayGroup[] = sortedKeys.map((dateKey) => ({
      dateKey,
      dayNumber: getDayNumber(dateKey),
      photos: grouped[dateKey],
    }));

    return groups;
  }, [photos, tripTimezone, tripStartDate]);

  // Toggle day collapse
  const toggleDay = (dateKey: string) => {
    setCollapsedDays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  // Expand all days
  const expandAllDays = () => {
    setCollapsedDays(new Set());
  };

  // Collapse all days
  const collapseAllDays = () => {
    const allDateKeys = dayGroups.map((g) => g.dateKey);
    setCollapsedDays(new Set(allDateKeys));
  };

  // Get photo URL
  const getPhotoUrl = (photo: Photo, thumbnail = true): string => {
    if (photo.source === 'local') {
      const path = thumbnail && photo.thumbnailPath ? photo.thumbnailPath : photo.localPath;
      return getFullAssetUrl(path) || '';
    }
    // For Immich, use thumbnailPath
    return getFullAssetUrl(photo.thumbnailPath) || '';
  };

  // Handle photo click - open lightbox
  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  // Handle lightbox navigation
  const handleNavigate = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  // Get full photo URL for lightbox
  const getLightboxPhotoUrl = (photo: Photo): string | null => {
    if (photo.source === 'local') {
      return getFullAssetUrl(photo.localPath) || null;
    }
    return getFullAssetUrl(photo.thumbnailPath) || null;
  };

  // Format time for display
  const getTimeDisplay = (photo: Photo): string | null => {
    if (!photo.takenAt) return null;

    const photoDate = new Date(photo.takenAt);
    // Check if time is midnight (likely no time recorded)
    if (photoDate.getHours() === 0 && photoDate.getMinutes() === 0) {
      return null;
    }

    return formatTime(photoDate, tripTimezone);
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-900 dark:text-white">
        Loading photo timeline...
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg
          className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-lg font-medium mb-2">No dated photos</p>
        <p className="text-sm">
          Photos need a "taken at" date to appear in the timeline.
          <br />
          Upload photos with EXIF data or manually set the date.
        </p>
      </div>
    );
  }

  return (
    <div className="photo-timeline">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'} across{' '}
          {dayGroups.length} {dayGroups.length === 1 ? 'day' : 'days'}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAllDays}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAllDays}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Day Groups */}
      <div className="space-y-6">
        {dayGroups.map((dayGroup) => {
          const isCollapsed = collapsedDays.has(dayGroup.dateKey);

          return (
            <div
              key={dayGroup.dateKey}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Day Header */}
              <button
                type="button"
                onClick={() => toggleDay(dayGroup.dateKey)}
                className="w-full bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-700 px-4 py-3 text-left hover:from-gray-100 hover:to-gray-150 dark:hover:from-gray-750 dark:hover:to-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {dayGroup.dayNumber && dayGroup.dayNumber > 0
                        ? `Day ${dayGroup.dayNumber} - `
                        : ''}
                      {new Date(dayGroup.dateKey).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {dayGroup.photos.length}{' '}
                      {dayGroup.photos.length === 1 ? 'photo' : 'photos'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        isCollapsed ? '' : 'rotate-180'
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Photo Grid */}
              {!isCollapsed && (
                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {dayGroup.photos.map((photo) => {
                      const timeDisplay = getTimeDisplay(photo);

                      return (
                        <div
                          key={photo.id}
                          className="group relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                          onClick={() => handlePhotoClick(photo)}
                        >
                          <img
                            src={getPhotoUrl(photo, true)}
                            alt={photo.caption || 'Trip photo'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />

                          {/* Time overlay */}
                          {timeDisplay && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                              <span className="text-xs text-white font-medium">
                                {timeDisplay}
                              </span>
                            </div>
                          )}

                          {/* Caption tooltip on hover */}
                          {photo.caption && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                              <p className="text-white text-xs text-center line-clamp-3">
                                {photo.caption}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          photos={photos}
          getPhotoUrl={getLightboxPhotoUrl}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={handleNavigate}
          tripId={tripId}
        />
      )}
    </div>
  );
}
