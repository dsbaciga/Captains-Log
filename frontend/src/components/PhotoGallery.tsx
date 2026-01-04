import { useState, useEffect, useRef } from "react";
import type { Photo, PhotoAlbum } from "../types/photo";
import photoService from "../services/photo.service";
import { getFullAssetUrl } from "../lib/config";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import PhotoLightbox from "./PhotoLightbox";
import ProgressiveImage from "./ProgressiveImage";

interface PhotoGalleryProps {
  photos: Photo[];
  albums?: PhotoAlbum[];
  onPhotoDeleted?: () => void;
  onPhotoUpdated?: () => void;
  onSetCoverPhoto?: (photoId: number) => void;
  onPhotosAddedToAlbum?: () => void;
  coverPhotoId?: number | null;
  totalPhotosInView?: number;
  onLoadAllPhotos?: () => Promise<void>;
  currentAlbumId?: number | null;
  onPhotosRemovedFromAlbum?: () => void;
}

interface ThumbnailCache {
  [photoId: number]: string; // Maps photo ID to blob URL
}

export default function PhotoGallery({
  photos,
  albums,
  onPhotoDeleted,
  onPhotoUpdated,
  onSetCoverPhoto,
  onPhotosAddedToAlbum,
  coverPhotoId,
  totalPhotosInView = 0,
  onLoadAllPhotos,
  currentAlbumId = null,
  onPhotosRemovedFromAlbum,
}: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editCaption, setEditCaption] = useState("");
  const [thumbnailCache, setThumbnailCache] = useState<ThumbnailCache>({});
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<number>>(
    new Set()
  );
  const [showAlbumSelectModal, setShowAlbumSelectModal] = useState(false);
  const [isAddingToAlbum, setIsAddingToAlbum] = useState(false);
  const [showCreateAlbumForm, setShowCreateAlbumForm] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumDescription, setNewAlbumDescription] = useState("");
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [isDeletingPhotos, setIsDeletingPhotos] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"date" | "name" | "location">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // Track which photos we're currently fetching to avoid duplicate requests
  const fetchingPhotos = useRef<Set<number>>(new Set());
  // Track photo IDs from previous render to detect which photos were removed
  const previousPhotoIds = useRef<Set<number>>(new Set());
  // Keep a ref to the cache for cleanup purposes (avoids stale closure issues)
  const thumbnailCacheRef = useRef<ThumbnailCache>({});

  // Keep cache ref in sync with state
  useEffect(() => {
    thumbnailCacheRef.current = thumbnailCache;
  }, [thumbnailCache]);

  // Load thumbnails for Immich photos with authentication
  useEffect(() => {
    const currentPhotoIds = new Set(photos.map((p) => p.id));

    // Only revoke blob URLs for photos that were in the previous set but are NOT in the current set
    // Skip cleanup when current photos is empty - this preserves cache when switching views
    // (e.g., All Photos -> Unsorted (0 photos) -> All Photos)
    if (previousPhotoIds.current.size > 0 && currentPhotoIds.size > 0) {
      const removedPhotoIds = [...previousPhotoIds.current].filter(
        (id) => !currentPhotoIds.has(id)
      );
      if (removedPhotoIds.length > 0) {
        console.log(
          "[PhotoGallery] Revoking blob URLs for removed photos:",
          removedPhotoIds
        );
        const cacheSnapshot = thumbnailCacheRef.current;
        removedPhotoIds.forEach((id) => {
          if (cacheSnapshot[id]) {
            URL.revokeObjectURL(cacheSnapshot[id]);
          }
          fetchingPhotos.current.delete(id);
        });
        // Remove revoked entries from cache
        setThumbnailCache((prev) => {
          const newCache = { ...prev };
          removedPhotoIds.forEach((id) => delete newCache[id]);
          return newCache;
        });
      }
    }

    // Update previous photo IDs for next render (only if we have photos)
    if (currentPhotoIds.size > 0) {
      previousPhotoIds.current = currentPhotoIds;
    }

    const loadThumbnails = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        console.log("[PhotoGallery] No access token available");
        return;
      }

      for (const photo of photos) {
        // Skip if already cached, currently fetching, or not an Immich photo
        if (
          thumbnailCache[photo.id] ||
          fetchingPhotos.current.has(photo.id) ||
          photo.source !== "immich" ||
          !photo.thumbnailPath
        ) {
          continue;
        }

        // Mark as fetching
        fetchingPhotos.current.add(photo.id);

        try {
          const fullUrl = getFullAssetUrl(photo.thumbnailPath);
          if (!fullUrl) continue;

          console.log(
            `[PhotoGallery] Fetching thumbnail for photo ${photo.id}:`,
            fullUrl
          );

          const response = await fetch(fullUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            console.error(
              `[PhotoGallery] Failed to fetch thumbnail for photo ${photo.id}: ${response.status} ${response.statusText}`
            );
            fetchingPhotos.current.delete(photo.id);
            continue;
          }

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          console.log(
            `[PhotoGallery] Successfully loaded thumbnail for photo ${photo.id}, blob URL: ${blobUrl}`
          );

          setThumbnailCache((prev) => ({
            ...prev,
            [photo.id]: blobUrl,
          }));

          // Remove from fetching set after successful load
          fetchingPhotos.current.delete(photo.id);
        } catch (error) {
          console.error(
            `[PhotoGallery] Error loading thumbnail for photo ${photo.id}:`,
            error
          );
          fetchingPhotos.current.delete(photo.id);
        }
      }
    };

    if (photos.length > 0) {
      loadThumbnails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]); // thumbnailCache removed - was causing infinite loop

  // Cleanup all blob URLs only when component unmounts
  useEffect(() => {
    const currentFetchingPhotos = fetchingPhotos.current;
    return () => {
      console.log("[PhotoGallery] Component unmounting, revoking blob URLs");
      // Use the ref to access current cache (avoids stale closure)
      Object.values(thumbnailCacheRef.current).forEach((url) =>
        URL.revokeObjectURL(url)
      );
      currentFetchingPhotos.clear();
    };
  }, []); // Empty array - only run cleanup on unmount

  const handleDelete = async (photoId: number) => {
    const confirmed = await confirm({
      title: "Delete Photo",
      message:
        "Are you sure you want to delete this photo? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await photoService.deletePhoto(photoId);
      setSelectedPhoto(null);
      onPhotoDeleted?.();
    } catch {
      alert("Failed to delete photo");
    }
  };

  const handleUpdateCaption = async () => {
    if (!selectedPhoto) return;

    try {
      await photoService.updatePhoto(selectedPhoto.id, {
        caption: editCaption || null,
      });
      setIsEditMode(false);
      onPhotoUpdated?.();
    } catch {
      alert("Failed to update photo");
    }
  };

  const togglePhotoSelection = (photoId: number, shiftKey: boolean = false) => {
    const photoIndex = photos.findIndex((p) => p.id === photoId);

    // Handle shift-click range selection
    if (shiftKey && lastSelectedIndex !== null) {
      const newSelection = new Set(selectedPhotoIds);
      const start = Math.min(lastSelectedIndex, photoIndex);
      const end = Math.max(lastSelectedIndex, photoIndex);

      // Select all photos in the range
      for (let i = start; i <= end; i++) {
        newSelection.add(photos[i].id);
      }

      setSelectedPhotoIds(newSelection);
      setLastSelectedIndex(photoIndex);
    } else {
      // Normal toggle behavior
      const newSelection = new Set(selectedPhotoIds);
      if (newSelection.has(photoId)) {
        newSelection.delete(photoId);
      } else {
        newSelection.add(photoId);
      }
      setSelectedPhotoIds(newSelection);
      setLastSelectedIndex(photoIndex);
    }
  };

  const selectAllLoadedPhotos = () => {
    const allPhotoIds = new Set(photos.map((p) => p.id));
    setSelectedPhotoIds(allPhotoIds);
  };

  // Effect to select all photos after loading completes (handles the case where
  // photos state updates after the onLoadAllPhotos promise resolves)
  // Using a ref instead of state to avoid triggering re-renders during loading
  const pendingSelectAll = useRef(false);

  useEffect(() => {
    if (pendingSelectAll.current && photos.length > 0 && photos.length >= totalPhotosInView) {
      pendingSelectAll.current = false;
      const allPhotoIds = new Set(photos.map((p) => p.id));
      setSelectedPhotoIds(allPhotoIds);
    }
  }, [photos, totalPhotosInView]);

  // Load all photos and select them once complete
  const selectAllPhotosInFolderWithEffect = async () => {
    if (!onLoadAllPhotos) {
      selectAllLoadedPhotos();
      return;
    }

    try {
      pendingSelectAll.current = true;
      await onLoadAllPhotos();
      // The effect will handle selection once photos.length >= totalPhotosInView
    } catch {
      pendingSelectAll.current = false;
      alert("Failed to load all photos");
    }
  };

  const deselectAllPhotos = () => {
    setSelectedPhotoIds(new Set());
    setLastSelectedIndex(null);
  };

  const handleAddToAlbum = async (albumId: number) => {
    if (selectedPhotoIds.size === 0) return;

    try {
      setIsAddingToAlbum(true);
      await photoService.addPhotosToAlbum(albumId, {
        photoIds: Array.from(selectedPhotoIds),
      });
      setShowAlbumSelectModal(false);
      setShowCreateAlbumForm(false);
      setSelectionMode(false);
      setSelectedPhotoIds(new Set());
      setLastSelectedIndex(null);
      onPhotosAddedToAlbum?.();
      alert(`Successfully added ${selectedPhotoIds.size} photo(s) to album`);
    } catch {
      alert("Failed to add photos to album");
    } finally {
      setIsAddingToAlbum(false);
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim() || selectedPhotoIds.size === 0) return;

    // Get tripId from the first selected photo
    const firstPhotoId = Array.from(selectedPhotoIds)[0];
    const firstPhoto = photos.find((p) => p.id === firstPhotoId);
    if (!firstPhoto) return;

    try {
      setIsCreatingAlbum(true);
      // Create the album
      const newAlbum = await photoService.createAlbum({
        tripId: firstPhoto.tripId,
        name: newAlbumName,
        description: newAlbumDescription || undefined,
      });

      // Add selected photos to the new album
      await photoService.addPhotosToAlbum(newAlbum.id, {
        photoIds: Array.from(selectedPhotoIds),
      });

      // Reset form and close modals
      setNewAlbumName("");
      setNewAlbumDescription("");
      setShowCreateAlbumForm(false);
      setShowAlbumSelectModal(false);
      setSelectionMode(false);
      setSelectedPhotoIds(new Set());
      setLastSelectedIndex(null);
      onPhotosAddedToAlbum?.();
      alert(
        `Successfully created album "${newAlbum.name}" with ${selectedPhotoIds.size} photo(s)`
      );
    } catch {
      alert("Failed to create album");
    } finally {
      setIsCreatingAlbum(false);
    }
  };

  const handleRemoveFromAlbum = async () => {
    if (selectedPhotoIds.size === 0 || !currentAlbumId) return;

    const confirmed = await confirm({
      title: "Remove Photos",
      message: `Remove ${selectedPhotoIds.size} photo(s) from this album? The photos will not be deleted, only removed from this album.`,
      confirmLabel: "Remove",
      variant: "warning",
    });
    if (!confirmed) return;

    try {
      setIsAddingToAlbum(true);
      // Remove photos one by one (backend doesn't have bulk remove yet)
      const photoIds = Array.from(selectedPhotoIds);
      for (const photoId of photoIds) {
        await photoService.removePhotoFromAlbum(currentAlbumId, photoId);
      }
      setSelectionMode(false);
      setSelectedPhotoIds(new Set());
      setLastSelectedIndex(null);
      onPhotosRemovedFromAlbum?.();
      alert(`Successfully removed ${photoIds.length} photo(s) from album`);
    } catch {
      alert("Failed to remove photos from album");
    } finally {
      setIsAddingToAlbum(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPhotoIds.size === 0) return;

    const confirmed = await confirm({
      title: "Delete Photos",
      message: `Are you sure you want to delete ${selectedPhotoIds.size} photo(s)? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      setIsDeletingPhotos(true);
      const photoIds = Array.from(selectedPhotoIds);
      for (const photoId of photoIds) {
        await photoService.deletePhoto(photoId);
      }
      setSelectionMode(false);
      setSelectedPhotoIds(new Set());
      setLastSelectedIndex(null);
      onPhotoDeleted?.();
    } catch {
      alert("Failed to delete photos");
    } finally {
      setIsDeletingPhotos(false);
    }
  };

  const getPhotoUrl = (photo: Photo): string | null => {
    if (photo.source === "local" && photo.localPath && photo.localPath !== "") {
      return getFullAssetUrl(photo.localPath);
    }
    // For Immich photos, use blob URL from cache
    if (photo.source === "immich") {
      return thumbnailCache[photo.id] || null;
    }
    return null;
  };

  const getThumbnailUrl = (photo: Photo): string | null => {
    if (
      photo.source === "local" &&
      photo.thumbnailPath &&
      photo.thumbnailPath !== ""
    ) {
      return getFullAssetUrl(photo.thumbnailPath);
    }
    // For Immich photos, use blob URL from cache
    if (photo.source === "immich") {
      return thumbnailCache[photo.id] || null;
    }
    // Fallback to full photo URL
    return getPhotoUrl(photo);
  };

  // Sort photos
  const sortedPhotos = [...photos].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "date": {
        const dateA = a.takenAt ? new Date(a.takenAt).getTime() : 0;
        const dateB = b.takenAt ? new Date(b.takenAt).getTime() : 0;
        comparison = dateB - dateA; // Most recent first by default
        break;
      }
      case "name": {
        const nameA = a.caption || "";
        const nameB = b.caption || "";
        comparison = nameA.localeCompare(nameB);
        break;
      }
      case "location": {
        const locA = a.location?.name || "";
        const locB = b.location?.name || "";
        comparison = locA.localeCompare(locB);
        break;
      }
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>No photos yet. Upload some photos to get started!</p>
      </div>
    );
  }

  return (
    <div data-testid="photo-gallery">
      <ConfirmDialogComponent />

      {/* View Controls */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 rounded-md transition-all duration-200 ${
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-800 text-primary-600 dark:text-sky shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
              title="Grid view"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 rounded-md transition-all duration-200 ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-800 text-primary-600 dark:text-sky shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
              title="List view"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          {/* Sort Dropdown */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split("-") as [
                typeof sortBy,
                typeof sortOrder
              ];
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
            className="px-3 py-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-sky transition-all"
            aria-label="Sort photos"
          >
            <option value="date-desc">Latest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="name-asc">Caption A-Z</option>
            <option value="name-desc">Caption Z-A</option>
            <option value="location-asc">Location A-Z</option>
            <option value="location-desc">Location Z-A</option>
          </select>
        </div>

        {/* Photo Count */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {photos.length} photo{photos.length !== 1 ? "s" : ""}
        </div>
      </div>
      {/* Selection Toolbar */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {!selectionMode ? (
          <button
            onClick={() => setSelectionMode(true)}
            className="btn btn-secondary"
          >
            Select Photos
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                setSelectionMode(false);
                setSelectedPhotoIds(new Set());
                setLastSelectedIndex(null);
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={selectAllLoadedPhotos}
              className="btn btn-secondary"
            >
              Select All Loaded ({photos.length})
            </button>
            {totalPhotosInView > photos.length && onLoadAllPhotos && (
              <button
                onClick={selectAllPhotosInFolderWithEffect}
                className="btn btn-secondary"
              >
                Select All in Folder ({totalPhotosInView})
              </button>
            )}
            {selectedPhotoIds.size > 0 && (
              <button onClick={deselectAllPhotos} className="btn btn-secondary">
                Deselect All
              </button>
            )}
            {currentAlbumId && currentAlbumId > 0 ? (
              <button
                onClick={handleRemoveFromAlbum}
                disabled={selectedPhotoIds.size === 0 || isAddingToAlbum}
                className="btn btn-danger"
              >
                Remove{" "}
                {selectedPhotoIds.size > 0 ? `${selectedPhotoIds.size} ` : ""}
                from Album
              </button>
            ) : (
              <>
                {albums && albums.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAlbumSelectModal(true)}
                    disabled={selectedPhotoIds.size === 0}
                    className="btn btn-primary"
                  >
                    Add{" "}
                    {selectedPhotoIds.size > 0
                      ? `${selectedPhotoIds.size} `
                      : ""}
                    to Album
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={selectedPhotoIds.size === 0}
                  className="btn btn-danger"
                >
                  {isDeletingPhotos ? "Deleting..." : "Delete"}{" "}
                  {selectedPhotoIds.size > 0 ? `${selectedPhotoIds.size} ` : ""}
                  {!isDeletingPhotos && `Photo${selectedPhotoIds.size !== 1 ? "s" : ""}`}
                </button>
              </>
            )}
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedPhotoIds.size} photo
              {selectedPhotoIds.size !== 1 ? "s" : ""} selected
            </span>
          </>
        )}
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedPhotos.map((photo, index) => {
            const thumbnailUrl = getThumbnailUrl(photo);
            const isSelected = selectedPhotoIds.has(photo.id);
            return (
              <div
                key={photo.id}
                className="relative group cursor-pointer aspect-square overflow-hidden rounded-xl bg-parchment dark:bg-navy-800 shadow-md hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-100"
                onClick={(e) =>
                  selectionMode
                    ? togglePhotoSelection(photo.id, e.shiftKey)
                    : setSelectedPhoto(photo)
                }
              >
                {thumbnailUrl ? (
                  <ProgressiveImage
                    src={thumbnailUrl}
                    alt={photo.caption || "Photo"}
                    aspectRatio="1/1"
                    imgClassName="transform group-hover:scale-110 transition-transform duration-500"
                    lazy={index > 20}
                    rootMargin="400px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate/40 dark:text-warm-gray/40">
                    <svg
                      className="w-16 h-16"
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

                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-white font-body text-sm font-medium line-clamp-2">
                        {photo.caption}
                      </p>
                    </div>
                  )}
                </div>

                {/* Badges */}
                {coverPhotoId === photo.id && (
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-xs px-3 py-1.5 rounded-full font-body font-semibold shadow-lg z-10">
                    Cover Photo
                  </div>
                )}
                {photo.location && (
                  <div className="absolute top-3 right-3 bg-primary-500/90 dark:bg-primary-600/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-body font-medium shadow-lg">
                    {photo.location.name}
                  </div>
                )}

                {/* Selection checkbox */}
                {selectionMode && (
                  <div className="absolute top-3 left-3 z-20">
                    <div
                      className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shadow-lg transition-all ${
                        isSelected
                          ? "bg-primary-600 dark:bg-accent-500 border-primary-600 dark:border-accent-500 scale-110"
                          : "bg-white/90 dark:bg-navy-800/90 border-primary-200 dark:border-navy-700 backdrop-blur-sm hover:border-primary-400 dark:hover:border-accent-400"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-5 h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {sortedPhotos.map((photo) => {
            const thumbnailUrl = getThumbnailUrl(photo);
            const isSelected = selectedPhotoIds.has(photo.id);
            return (
              <div
                key={photo.id}
                className="relative group cursor-pointer bg-white dark:bg-navy-800 rounded-xl p-4 shadow-md hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary-200 dark:hover:border-sky/30"
                onClick={(e) =>
                  selectionMode
                    ? togglePhotoSelection(photo.id, e.shiftKey)
                    : setSelectedPhoto(photo)
                }
              >
                <div className="flex items-center gap-4">
                  {/* Selection checkbox */}
                  {selectionMode && (
                    <div className="flex-shrink-0">
                      <div
                        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shadow-lg transition-all ${
                          isSelected
                            ? "bg-primary-600 dark:bg-accent-500 border-primary-600 dark:border-accent-500 scale-110"
                            : "bg-white/90 dark:bg-navy-800/90 border-primary-200 dark:border-navy-700 backdrop-blur-sm hover:border-primary-400 dark:hover:border-accent-400"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-5 h-5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-24 h-24 overflow-hidden rounded-lg">
                    {thumbnailUrl ? (
                      <ProgressiveImage
                        src={thumbnailUrl}
                        alt={photo.caption || "Photo"}
                        aspectRatio="1/1"
                        imgClassName="transform group-hover:scale-110 transition-transform duration-500"
                        lazy={true}
                        rootMargin="400px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-400">
                        <svg
                          className="w-10 h-10"
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

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {photo.caption && (
                          <p className="font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
                            {photo.caption}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                          {photo.takenAt && (
                            <span className="flex items-center gap-1">
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
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              {new Date(photo.takenAt).toLocaleDateString()}
                            </span>
                          )}
                          {photo.location && (
                            <span className="flex items-center gap-1">
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
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                              </svg>
                              {photo.location.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {coverPhotoId === photo.id && (
                          <span className="bg-gradient-to-r from-accent-500 to-accent-600 text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg">
                            Cover
                          </span>
                        )}
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                          {photo.source === "local" ? "Uploaded" : "Immich"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          photos={photos}
          getPhotoUrl={getPhotoUrl}
          onClose={() => {
            setSelectedPhoto(null);
            setIsEditMode(false);
          }}
          onNavigate={(photo) => setSelectedPhoto(photo)}
          onEdit={() => {
            setEditCaption(selectedPhoto.caption || "");
            setIsEditMode(true);
          }}
          onDelete={() => handleDelete(selectedPhoto.id)}
          onSetCover={
            onSetCoverPhoto
              ? () => {
                  onSetCoverPhoto(selectedPhoto.id);
                  setSelectedPhoto(null);
                }
              : undefined
          }
          showCoverButton={
            !!onSetCoverPhoto && coverPhotoId !== selectedPhoto.id
          }
          editMode={isEditMode}
          editCaption={editCaption}
          onEditCaptionChange={setEditCaption}
          onSaveCaption={handleUpdateCaption}
          onCancelEdit={() => setIsEditMode(false)}
        />
      )}

      {/* Album Selection Modal */}
      {showAlbumSelectModal && albums && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowAlbumSelectModal(false);
            setShowCreateAlbumForm(false);
            setNewAlbumName("");
            setNewAlbumDescription("");
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {showCreateAlbumForm ? "Create New Album" : "Select Album"}
            </h3>

            {!showCreateAlbumForm ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Add {selectedPhotoIds.size} selected photo
                  {selectedPhotoIds.size !== 1 ? "s" : ""} to:
                </p>

                {/* Create New Album Button */}
                <button
                  onClick={() => setShowCreateAlbumForm(true)}
                  className="w-full p-4 mb-4 rounded-lg border-2 border-dashed border-blue-500 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-blue-600 dark:text-blue-400 font-medium flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create New Album
                </button>

                {/* Existing Albums List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {albums.map((album) => (
                    <button
                      key={album.id}
                      onClick={() => handleAddToAlbum(album.id)}
                      disabled={isAddingToAlbum}
                      className="w-full text-left p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {album.name}
                      </div>
                      {album.description && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {album.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {album._count?.photoAssignments || 0} photos
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Create Album Form */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Create a new album with {selectedPhotoIds.size} selected
                  photo
                  {selectedPhotoIds.size !== 1 ? "s" : ""}
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Album Name *
                    </label>
                    <input
                      type="text"
                      value={newAlbumName}
                      onChange={(e) => setNewAlbumName(e.target.value)}
                      placeholder="Enter album name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={newAlbumDescription}
                      onChange={(e) => setNewAlbumDescription(e.target.value)}
                      placeholder="Enter album description"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => {
                      setShowCreateAlbumForm(false);
                      setNewAlbumName("");
                      setNewAlbumDescription("");
                    }}
                    className="flex-1 btn btn-secondary"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateAlbum}
                    disabled={
                      !newAlbumName.trim() || isCreatingAlbum || isAddingToAlbum
                    }
                    className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingAlbum ? "Creating..." : "Create Album"}
                  </button>
                </div>
              </>
            )}

            {!showCreateAlbumForm && (
              <button
                onClick={() => {
                  setShowAlbumSelectModal(false);
                  setShowCreateAlbumForm(false);
                  setNewAlbumName("");
                  setNewAlbumDescription("");
                }}
                className="mt-4 w-full btn btn-secondary"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
