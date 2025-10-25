import { useEffect, useState, useId } from "react";
import { useParams, Link } from "react-router-dom";
import type { AlbumWithPhotos, Photo } from "../types/photo";
import type { Location } from "../types/location";
import type { Activity } from "../types/activity";
import type { Lodging } from "../types/lodging";
import photoService from "../services/photo.service";
import locationService from "../services/location.service";
import activityService from "../services/activity.service";
import lodgingService from "../services/lodging.service";
import PhotoGallery from "../components/PhotoGallery";
import { usePagination } from "../hooks/usePagination";

export default function AlbumDetailPage() {
  const { tripId, albumId } = useParams<{ tripId: string; albumId: string }>();
  const [album, setAlbum] = useState<AlbumWithPhotos | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [albumName, setAlbumName] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [locationId, setLocationId] = useState<number | null>(null);
  const [activityId, setActivityId] = useState<number | null>(null);
  const [lodgingId, setLodgingId] = useState<number | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [lodgings, setLodgings] = useState<Lodging[]>([]);
  const albumNameId = useId();
  const albumDescriptionId = useId();
  const locationSelectId = useId();
  const activitySelectId = useId();
  const lodgingSelectId = useId();

  // Pagination hook for album photos
  // Load function defined inline to avoid stale closures with albumId
  const photosPagination = usePagination<Photo>(
    async (skip, take) => {
      if (!albumId) return { items: [], total: 0, hasMore: false };

      const data = await photoService.getAlbumById(parseInt(albumId), {
        skip,
        take,
      });

      console.log('[AlbumDetailPage] Loaded album data:', {
        albumId,
        skip,
        photosCount: data.photos?.length || 0,
        hasMore: data.hasMore,
        total: data.total,
      });

      return {
        items: data.photos.map(p => p.photo),
        total: data.total || 0,
        hasMore: data.hasMore || false,
      };
    },
    { pageSize: 40, enabled: true }
  );

  useEffect(() => {
    // Clear previous album's photos before loading new album
    photosPagination.clear();
    loadAlbum();
    loadTripData();
  }, [albumId, tripId]);

  const loadTripData = async () => {
    if (!tripId) return;

    try {
      const [locationsData, activitiesData, lodgingsData] = await Promise.all([
        locationService.getLocationsByTrip(parseInt(tripId)),
        activityService.getActivitiesByTrip(parseInt(tripId)),
        lodgingService.getLodgingByTrip(parseInt(tripId)),
      ]);

      setLocations(locationsData);
      setActivities(activitiesData);
      setLodgings(lodgingsData);
    } catch (error) {
      console.error("Failed to load trip data:", error);
    }
  };

  const loadAlbum = async () => {
    if (!albumId) return;

    setIsLoading(true);

    try {
      const data = await photoService.getAlbumById(parseInt(albumId), {
        skip: 0,
        take: 40,
      });

      setAlbum(data);
      setAlbumName(data.name);
      setAlbumDescription(data.description || "");
      setLocationId(data.locationId || null);
      setActivityId(data.activityId || null);
      setLodgingId(data.lodgingId || null);
    } catch (error) {
      console.error("Failed to load album:", error);
    } finally {
      setIsLoading(false);
      // Load photos after loading state is cleared
      // This ensures the component is fully rendered before pagination loads
      photosPagination.loadInitial();
    }
  };

  const handleUpdateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumId || !albumName.trim()) return;

    try {
      await photoService.updateAlbum(parseInt(albumId), {
        name: albumName,
        description: albumDescription || null,
        locationId,
        activityId,
        lodgingId,
      });

      setIsEditMode(false);
      loadAlbum();
    } catch (error) {
      alert("Failed to update album");
    }
  };

  const handleRemovePhoto = async (photoId: number) => {
    if (!albumId) return;
    if (!confirm("Remove this photo from the album?")) return;

    try {
      await photoService.removePhotoFromAlbum(parseInt(albumId), photoId);
      loadAlbum();
    } catch (error) {
      alert("Failed to remove photo from album");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-8 text-gray-900 dark:text-white">
          Loading...
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-8 text-gray-900 dark:text-white">
          Album not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Link
          to={`/trips/${tripId}`}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 inline-block"
        >
          ← Back to Trip
        </Link>

        {isEditMode ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Edit Album
            </h2>
            <form onSubmit={handleUpdateAlbum} className="space-y-4">
              <div>
                <label
                  htmlFor={albumNameId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Album Name *
                </label>
                <input
                  type="text"
                  id={albumNameId}
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor={albumDescriptionId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Description
                </label>
                <textarea
                  id={albumDescriptionId}
                  value={albumDescription}
                  onChange={(e) => setAlbumDescription(e.target.value)}
                  rows={3}
                  className="input"
                />
              </div>

              {/* Location Association */}
              {locations.length > 0 && (
                <div>
                  <label
                    htmlFor={locationSelectId}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Associated Location (Optional)
                  </label>
                  <select
                    id={locationSelectId}
                    value={locationId || ''}
                    onChange={(e) => setLocationId(e.target.value ? parseInt(e.target.value) : null)}
                    className="input"
                  >
                    <option value="">None</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Activity Association */}
              {activities.length > 0 && (
                <div>
                  <label
                    htmlFor={activitySelectId}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Associated Activity (Optional)
                  </label>
                  <select
                    id={activitySelectId}
                    value={activityId || ''}
                    onChange={(e) => setActivityId(e.target.value ? parseInt(e.target.value) : null)}
                    className="input"
                  >
                    <option value="">None</option>
                    {activities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lodging Association */}
              {lodgings.length > 0 && (
                <div>
                  <label
                    htmlFor={lodgingSelectId}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Associated Lodging (Optional)
                  </label>
                  <select
                    id={lodgingSelectId}
                    value={lodgingId || ''}
                    onChange={(e) => setLodgingId(e.target.value ? parseInt(e.target.value) : null)}
                    className="input"
                  >
                    <option value="">None</option>
                    {lodgings.map((lodging) => (
                      <option key={lodging.id} value={lodging.id}>
                        {lodging.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {album.name}
                </h1>
                {album.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {album.description}
                  </p>
                )}
                <p className="text-gray-500 dark:text-gray-400">
                  {photosPagination.total} photo
                  {photosPagination.total !== 1 ? "s" : ""}
                </p>

                {/* Display associations */}
                {(album.location || album.activity || album.lodging) && (
                  <div className="mt-4 space-y-2">
                    {album.location && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Location:</span> {album.location.name}
                      </div>
                    )}
                    {album.activity && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Activity:</span> {album.activity.name}
                      </div>
                    )}
                    {album.lodging && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Lodging:</span> {album.lodging.name}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsEditMode(true)}
                className="btn btn-secondary"
              >
                Edit Album
              </button>
            </div>
          </div>
        )}

        {photosPagination.items.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400">
              No photos in this album yet. Add photos from your trip gallery!
            </p>
            <Link
              to={`/trips/${tripId}`}
              className="btn btn-primary inline-block mt-4"
            >
              Go to Trip Gallery
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <PhotoGallery
              photos={photosPagination.items}
              onPhotoDeleted={() => loadAlbum()}
              onPhotoUpdated={() => loadAlbum()}
            />

            {photosPagination.hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={photosPagination.loadMore}
                  disabled={photosPagination.loadingMore}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {photosPagination.loadingMore ? "Loading..." : "Load More Photos"}
                </button>
              </div>
            )}

            {/* Debug info */}
            <div className="mt-4 text-xs text-gray-400 text-center">
              Frontend v1.1.5 | Photos: {photosPagination.items.length}/{photosPagination.total} | hasMore: {String(photosPagination.hasMore)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
