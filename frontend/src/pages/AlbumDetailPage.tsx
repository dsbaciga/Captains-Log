import { useEffect, useState, useId } from "react";
import { useParams, Link } from "react-router-dom";
import type { AlbumWithPhotos, Photo } from "../types/photo";
import type { Location } from "../types/location";
import type { Activity } from "../types/activity";
import type { Lodging } from "../types/lodging";
import type { Trip } from "../types/trip";
import photoService from "../services/photo.service";
import locationService from "../services/location.service";
import activityService from "../services/activity.service";
import lodgingService from "../services/lodging.service";
import tripService from "../services/trip.service";
import PhotoGallery from "../components/PhotoGallery";
import Breadcrumbs from "../components/Breadcrumbs";
import { usePagination } from "../hooks/usePagination";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { getAssetBaseUrl } from "../lib/config";
import toast from "react-hot-toast";

export default function AlbumDetailPage() {
  const { tripId, albumId } = useParams<{ tripId: string; albumId: string }>();
  const { ConfirmDialogComponent } = useConfirmDialog();
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
  const [trip, setTrip] = useState<Trip | null>(null);
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);
  const [availablePhotos, setAvailablePhotos] = useState<Photo[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<number>>(new Set());
  const [isAddingPhotos, setIsAddingPhotos] = useState(false);
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
      const [tripData, locationsData, activitiesData, lodgingsData] = await Promise.all([
        tripService.getTripById(parseInt(tripId)),
        locationService.getLocationsByTrip(parseInt(tripId)),
        activityService.getActivitiesByTrip(parseInt(tripId)),
        lodgingService.getLodgingByTrip(parseInt(tripId)),
      ]);

      setTrip(tripData);
      setLocations(locationsData);
      setActivities(activitiesData);
      setLodgings(lodgingsData);
    } catch (err) {
      console.error("Failed to load trip data:", err);
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
    } catch (err) {
      console.error("Failed to load album:", err);
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
    } catch {
      alert("Failed to update album");
    }
  };

  const loadAvailablePhotos = async () => {
    if (!tripId || !albumId) return;

    try {
      // Get all photos for the trip
      const allPhotos = await photoService.getPhotosByTrip(parseInt(tripId));

      // Get current album photo IDs
      const currentPhotoIds = new Set(
        photosPagination.items.map(p => p.id)
      );

      // Filter out photos already in the album
      const available = allPhotos.filter(p => !currentPhotoIds.has(p.id));
      setAvailablePhotos(available);
    } catch (err) {
      console.error("Failed to load available photos:", err);
      toast.error("Failed to load photos");
    }
  };

  const handleOpenPhotoSelector = () => {
    setShowPhotoSelector(true);
    setSelectedPhotoIds(new Set());
    loadAvailablePhotos();
  };

  const togglePhotoSelection = (photoId: number) => {
    const newSelection = new Set(selectedPhotoIds);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotoIds(newSelection);
  };

  const handleAddSelectedPhotos = async () => {
    if (!albumId || selectedPhotoIds.size === 0) return;

    try {
      setIsAddingPhotos(true);
      await photoService.addPhotosToAlbum(parseInt(albumId), {
        photoIds: Array.from(selectedPhotoIds),
      });

      toast.success(`Added ${selectedPhotoIds.size} photo(s) to album`);
      setShowPhotoSelector(false);
      setSelectedPhotoIds(new Set());

      // Reload album to show new photos
      photosPagination.clear();
      await loadAlbum();
    } catch (err) {
      console.error("Failed to add photos:", err);
      toast.error("Failed to add photos to album");
    } finally {
      setIsAddingPhotos(false);
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
        <Breadcrumbs
          items={[
            { label: 'Trips', href: '/trips' },
            { label: trip?.title || 'Trip', href: `/trips/${tripId}` },
            { label: album.name }
          ]}
        />

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
              <div className="flex gap-2">
                <button
                  onClick={handleOpenPhotoSelector}
                  className="btn btn-primary"
                >
                  + Add Photos
                </button>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="btn btn-secondary"
                >
                  Edit Album
                </button>
              </div>
            </div>
          </div>
        )}

        {photosPagination.items.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No photos in this album yet.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleOpenPhotoSelector}
                className="btn btn-primary"
              >
                + Add Photos
              </button>
              <Link
                to={`/trips/${tripId}`}
                className="btn btn-secondary"
              >
                Go to Trip Gallery
              </Link>
            </div>
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

        {/* Photo Selector Modal */}
        {showPhotoSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Add Photos to Album
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedPhotoIds.size} photo{selectedPhotoIds.size !== 1 ? 's' : ''} selected
                  </p>
                </div>
                <button
                  onClick={() => setShowPhotoSelector(false)}
                  type="button"
                  aria-label="Close"
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Photo Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                {availablePhotos.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                      No more photos available to add to this album.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {availablePhotos.map((photo) => {
                      const isSelected = selectedPhotoIds.has(photo.id);
                      const photoUrl =
                        photo.source === "immich"
                          ? `${getAssetBaseUrl()}/immich/thumbnail/${photo.immichAssetId}`
                          : `${getAssetBaseUrl()}/${photo.thumbnailPath}`;

                      return (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => togglePhotoSelection(photo.id)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-4 transition-all ${
                            isSelected
                              ? "border-blue-500 ring-2 ring-blue-500"
                              : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                        >
                          <img
                            src={photoUrl}
                            alt={photo.caption || "Photo"}
                            className="w-full h-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-blue-500 bg-opacity-30 flex items-center justify-center">
                              <svg
                                className="w-8 h-8 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPhotoIds.size === availablePhotos.length) {
                      setSelectedPhotoIds(new Set());
                    } else {
                      setSelectedPhotoIds(new Set(availablePhotos.map(p => p.id)));
                    }
                  }}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  {selectedPhotoIds.size === availablePhotos.length ? "Deselect All" : "Select All"}
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPhotoSelector(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSelectedPhotos}
                    disabled={selectedPhotoIds.size === 0 || isAddingPhotos}
                    className="btn btn-primary"
                  >
                    {isAddingPhotos
                      ? "Adding..."
                      : `Add ${selectedPhotoIds.size} Photo${selectedPhotoIds.size !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialogComponent />
      </div>
    </div>
  );
}
