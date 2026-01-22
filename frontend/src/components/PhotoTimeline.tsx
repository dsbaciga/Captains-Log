import { useState, useEffect, useCallback } from 'react';
import type { Photo } from '../types/photo';
import photoService, { PhotoDateGrouping } from '../services/photo.service';
import { getDateStringInTimezone, formatTime, getDayNumber } from './timeline/utils';
import { getFullAssetUrl } from '../lib/config';
import PhotoLightbox from './PhotoLightbox';
import toast from 'react-hot-toast';

interface PhotoTimelineProps {
  tripId: number;
  tripTimezone?: string;
  tripStartDate?: string;
}

interface DayGroupState {
  dateKey: string; // Formatted display date
  rawDate: string; // YYYY-MM-DD for API calls
  dayNumber: number | null;
  count: number;
  photos: Photo[] | null; // null = not loaded yet
  loading: boolean;
  error: boolean;
}

// Placeholder image for failed loads
const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239CA3AF"%3E%3Cpath d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/%3E%3C/svg%3E';

export default function PhotoTimeline({
  tripId,
  tripTimezone,
  tripStartDate,
}: PhotoTimelineProps) {
  const [dayGroups, setDayGroups] = useState<DayGroupState[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalWithDates, setTotalWithDates] = useState(0);
  const [totalWithoutDates, setTotalWithoutDates] = useState(0);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [allLoadedPhotos, setAllLoadedPhotos] = useState<Photo[]>([]);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  // Load date groupings (lightweight - just dates and counts)
  const loadDateGroupings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await photoService.getPhotoDateGroupings(tripId);

      // Convert date groupings to day group state
      const groups: DayGroupState[] = result.groupings.map((g: PhotoDateGrouping) => {
        const date = new Date(g.date + 'T12:00:00'); // Use noon to avoid timezone issues
        const dateKey = getDateStringInTimezone(date, tripTimezone);

        return {
          dateKey,
          rawDate: g.date,
          dayNumber: getDayNumber(dateKey, tripStartDate),
          count: g.count,
          photos: null, // Not loaded yet
          loading: false,
          error: false,
        };
      });

      setDayGroups(groups);
      setTotalWithDates(result.totalWithDates);
      setTotalWithoutDates(result.totalWithoutDates);
    } catch (error) {
      console.error('Error loading date groupings:', error);
      toast.error('Failed to load photo timeline');
    } finally {
      setLoading(false);
    }
  }, [tripId, tripTimezone, tripStartDate]);

  useEffect(() => {
    loadDateGroupings();
  }, [loadDateGroupings]);

  // Load photos for a specific day
  const loadPhotosForDay = useCallback(async (rawDate: string) => {
    // Mark as loading
    setDayGroups(prev => prev.map(g =>
      g.rawDate === rawDate ? { ...g, loading: true, error: false } : g
    ));

    try {
      const result = await photoService.getPhotosByDate(tripId, rawDate);

      // Sort photos: no-time photos first, then by time
      const sortedPhotos = [...result.photos].sort((a, b) => {
        const aDate = new Date(a.takenAt!);
        const bDate = new Date(b.takenAt!);
        const aHasTime = aDate.getUTCHours() !== 0 || aDate.getUTCMinutes() !== 0;
        const bHasTime = bDate.getUTCHours() !== 0 || bDate.getUTCMinutes() !== 0;

        if (!aHasTime && bHasTime) return -1;
        if (aHasTime && !bHasTime) return 1;
        return aDate.getTime() - bDate.getTime();
      });

      // Update the day group with loaded photos
      setDayGroups(prev => prev.map(g =>
        g.rawDate === rawDate ? { ...g, photos: sortedPhotos, loading: false } : g
      ));

      // Add to allLoadedPhotos for lightbox navigation
      setAllLoadedPhotos(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newPhotos = sortedPhotos.filter(p => !existingIds.has(p.id));
        return [...prev, ...newPhotos];
      });
    } catch (error) {
      console.error(`Error loading photos for ${rawDate}:`, error);
      setDayGroups(prev => prev.map(g =>
        g.rawDate === rawDate ? { ...g, loading: false, error: true } : g
      ));
      toast.error(`Failed to load photos for ${rawDate}`);
    }
  }, [tripId]);

  // Toggle day expansion
  const toggleDay = useCallback((rawDate: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rawDate)) {
        newSet.delete(rawDate);
      } else {
        newSet.add(rawDate);
        // Load photos if not already loaded
        const group = dayGroups.find(g => g.rawDate === rawDate);
        if (group && group.photos === null && !group.loading) {
          loadPhotosForDay(rawDate);
        }
      }
      return newSet;
    });
  }, [dayGroups, loadPhotosForDay]);

  // Expand all days
  const expandAllDays = useCallback(() => {
    const allDates = dayGroups.map(g => g.rawDate);
    setExpandedDays(new Set(allDates));

    // Load photos for all days that haven't been loaded
    dayGroups.forEach(group => {
      if (group.photos === null && !group.loading) {
        loadPhotosForDay(group.rawDate);
      }
    });
  }, [dayGroups, loadPhotosForDay]);

  // Collapse all days
  const collapseAllDays = useCallback(() => {
    setExpandedDays(new Set());
  }, []);

  // Get photo URL
  const getPhotoUrl = (photo: Photo, thumbnail = true): string => {
    if (photo.source === 'local') {
      const path = thumbnail && photo.thumbnailPath ? photo.thumbnailPath : photo.localPath;
      return getFullAssetUrl(path) || '';
    }
    return getFullAssetUrl(photo.thumbnailPath) || '';
  };

  // Handle photo click
  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  // Handle keyboard interaction
  const handlePhotoKeyDown = (event: React.KeyboardEvent, photo: Photo) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePhotoClick(photo);
    }
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

  // Handle image error
  const handleImageError = (photoId: number) => {
    setFailedImages(prev => new Set(prev).add(photoId));
  };

  // Format time for display
  const getTimeDisplay = (photo: Photo): string | null => {
    if (!photo.takenAt) return null;
    const photoDate = new Date(photo.takenAt);
    if (photoDate.getUTCHours() === 0 && photoDate.getUTCMinutes() === 0) {
      return null;
    }
    return formatTime(photoDate, tripTimezone);
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-900 dark:text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading photo timeline...</p>
      </div>
    );
  }

  if (dayGroups.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg
          className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
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
        {totalWithoutDates > 0 && (
          <p className="text-sm mt-2 text-gray-400">
            {totalWithoutDates} photos without dates are not shown.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="photo-timeline">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {totalWithDates} {totalWithDates === 1 ? 'photo' : 'photos'} across{' '}
          {dayGroups.length} {dayGroups.length === 1 ? 'day' : 'days'}
          {totalWithoutDates > 0 && (
            <span className="ml-2 text-gray-400">
              ({totalWithoutDates} undated)
            </span>
          )}
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
          const isExpanded = expandedDays.has(dayGroup.rawDate);
          const dayContentId = `day-content-${dayGroup.rawDate}`;

          return (
            <div
              key={dayGroup.rawDate}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Day Header */}
              <button
                type="button"
                onClick={() => toggleDay(dayGroup.rawDate)}
                aria-expanded={isExpanded}
                aria-controls={dayContentId}
                className="w-full bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-700 px-4 py-3 text-left hover:from-gray-100 hover:to-gray-150 dark:hover:from-gray-750 dark:hover:to-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {dayGroup.dayNumber && dayGroup.dayNumber > 0
                        ? `Day ${dayGroup.dayNumber} - `
                        : ''}
                      {new Date(dayGroup.rawDate + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {dayGroup.count} {dayGroup.count === 1 ? 'photo' : 'photos'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {dayGroup.loading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
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
              {isExpanded && (
                <div id={dayContentId} className="p-4">
                  {dayGroup.loading && !dayGroup.photos && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm">Loading photos...</p>
                    </div>
                  )}

                  {dayGroup.error && (
                    <div className="text-center py-8 text-red-500">
                      <p className="text-sm">Failed to load photos</p>
                      <button
                        type="button"
                        onClick={() => loadPhotosForDay(dayGroup.rawDate)}
                        className="mt-2 text-sm text-blue-600 hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {dayGroup.photos && dayGroup.photos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {dayGroup.photos.map((photo) => {
                        const timeDisplay = getTimeDisplay(photo);
                        const hasFailed = failedImages.has(photo.id);

                        return (
                          <div
                            key={photo.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handlePhotoClick(photo)}
                            onKeyDown={(e) => handlePhotoKeyDown(e, photo)}
                            className="group relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            aria-label={photo.caption || `Photo from ${dayGroup.dateKey}${timeDisplay ? ` at ${timeDisplay}` : ''}`}
                          >
                            <img
                              src={hasFailed ? PLACEHOLDER_IMAGE : getPhotoUrl(photo, true)}
                              alt={photo.caption || 'Trip photo'}
                              className={`w-full h-full object-cover ${hasFailed ? 'p-4 bg-gray-200 dark:bg-gray-600' : ''}`}
                              loading="lazy"
                              onError={() => handleImageError(photo.id)}
                            />

                            {/* Time overlay */}
                            {timeDisplay && !hasFailed && (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                                <span className="text-xs text-white font-medium">
                                  {timeDisplay}
                                </span>
                              </div>
                            )}

                            {/* Caption tooltip on hover */}
                            {photo.caption && !hasFailed && (
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
                  )}

                  {dayGroup.photos && dayGroup.photos.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No photos for this day</p>
                    </div>
                  )}
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
          photos={allLoadedPhotos.length > 0 ? allLoadedPhotos : [selectedPhoto]}
          getPhotoUrl={getLightboxPhotoUrl}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={handleNavigate}
          tripId={tripId}
        />
      )}
    </div>
  );
}
