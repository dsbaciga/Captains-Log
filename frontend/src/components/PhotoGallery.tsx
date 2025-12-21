import { useState, useEffect, useRef } from 'react';
import type { Photo, PhotoAlbum } from '../types/photo';
import photoService from '../services/photo.service';
import { getAssetBaseUrl } from '../lib/config';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

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
  const [editCaption, setEditCaption] = useState('');
  const [thumbnailCache, setThumbnailCache] = useState<ThumbnailCache>({});
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<number>>(new Set());
  const [showAlbumSelectModal, setShowAlbumSelectModal] = useState(false);
  const [isAddingToAlbum, setIsAddingToAlbum] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // Track which photos we're currently fetching to avoid duplicate requests
  const fetchingPhotos = useRef<Set<number>>(new Set());

  // Load thumbnails for Immich photos with authentication
  useEffect(() => {
    // Clear cache when photos array is empty (e.g., album changed)
    if (photos.length === 0 && Object.keys(thumbnailCache).length > 0) {
      console.log('[PhotoGallery] Photos cleared, revoking cached blob URLs');
      Object.values(thumbnailCache).forEach(url => URL.revokeObjectURL(url));
      setThumbnailCache({});
      fetchingPhotos.current.clear();
      return;
    }

    const loadThumbnails = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('[PhotoGallery] No access token available');
        return;
      }

      const baseUrl = getAssetBaseUrl();

      for (const photo of photos) {
        // Skip if already cached, currently fetching, or not an Immich photo
        if (
          thumbnailCache[photo.id] ||
          fetchingPhotos.current.has(photo.id) ||
          photo.source !== 'immich' ||
          !photo.thumbnailPath
        ) {
          continue;
        }

        // Mark as fetching
        fetchingPhotos.current.add(photo.id);

        try {
          console.log(`[PhotoGallery] Fetching thumbnail for photo ${photo.id}:`, `${baseUrl}${photo.thumbnailPath}`);

          const response = await fetch(`${baseUrl}${photo.thumbnailPath}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            console.error(`[PhotoGallery] Failed to fetch thumbnail for photo ${photo.id}: ${response.status} ${response.statusText}`);
            fetchingPhotos.current.delete(photo.id);
            continue;
          }

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          console.log(`[PhotoGallery] Successfully loaded thumbnail for photo ${photo.id}, blob URL: ${blobUrl}`);

          setThumbnailCache(prev => ({
            ...prev,
            [photo.id]: blobUrl,
          }));

          // Remove from fetching set after successful load
          fetchingPhotos.current.delete(photo.id);
        } catch (error) {
          console.error(`[PhotoGallery] Error loading thumbnail for photo ${photo.id}:`, error);
          fetchingPhotos.current.delete(photo.id);
        }
      }
    };

    if (photos.length > 0) {
      loadThumbnails();
    }
  }, [photos]); // thumbnailCache removed - was causing infinite loop

  // Cleanup all blob URLs only when component unmounts
  useEffect(() => {
    return () => {
      console.log('[PhotoGallery] Component unmounting, revoking blob URLs');
      // Access thumbnailCache via a ref to avoid dependency
      Object.values(thumbnailCache).forEach(url => URL.revokeObjectURL(url));
      fetchingPhotos.current.clear();
    };
  }, []); // Empty array - only run cleanup on unmount

  const handleDelete = async (photoId: number) => {
    const confirmed = await confirm({
      title: "Delete Photo",
      message: "Are you sure you want to delete this photo? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await photoService.deletePhoto(photoId);
      setSelectedPhoto(null);
      onPhotoDeleted?.();
    } catch (error) {
      alert('Failed to delete photo');
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
    } catch (error) {
      alert('Failed to update photo');
    }
  };

  const togglePhotoSelection = (photoId: number, shiftKey: boolean = false) => {
    const photoIndex = photos.findIndex(p => p.id === photoId);

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
    const allPhotoIds = new Set(photos.map(p => p.id));
    setSelectedPhotoIds(allPhotoIds);
  };

  const selectAllPhotosInFolder = async () => {
    if (!onLoadAllPhotos) {
      // If no load function provided, just select all loaded
      selectAllLoadedPhotos();
      return;
    }

    try {
      // Load all photos first
      await onLoadAllPhotos();
      // Then select all (photos will be updated via useEffect below)
    } catch (error) {
      alert('Failed to load all photos');
    }
  };

  // Effect to select all photos after they're loaded
  const [shouldSelectAll, setShouldSelectAll] = useState(false);

  useEffect(() => {
    if (shouldSelectAll && photos.length === totalPhotosInView) {
      const allPhotoIds = new Set(photos.map(p => p.id));
      setSelectedPhotoIds(allPhotoIds);
      setShouldSelectAll(false);
    }
  }, [photos.length, totalPhotosInView, shouldSelectAll]);

  // Update selectAllPhotosInFolder to trigger the effect
  const selectAllPhotosInFolderWithEffect = async () => {
    if (!onLoadAllPhotos) {
      selectAllLoadedPhotos();
      return;
    }

    try {
      setShouldSelectAll(true);
      await onLoadAllPhotos();
    } catch (error) {
      setShouldSelectAll(false);
      alert('Failed to load all photos');
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
      setSelectionMode(false);
      setSelectedPhotoIds(new Set());
      setLastSelectedIndex(null);
      onPhotosAddedToAlbum?.();
      alert(`Successfully added ${selectedPhotoIds.size} photo(s) to album`);
    } catch (error) {
      alert('Failed to add photos to album');
    } finally {
      setIsAddingToAlbum(false);
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
    } catch (error) {
      alert('Failed to remove photos from album');
    } finally {
      setIsAddingToAlbum(false);
    }
  };

  const getPhotoUrl = (photo: Photo): string | null => {
    const baseUrl = getAssetBaseUrl();
    if (photo.source === 'local' && photo.localPath && photo.localPath !== '') {
      return `${baseUrl}${photo.localPath}`;
    }
    // For Immich photos, use blob URL from cache
    if (photo.source === 'immich') {
      return thumbnailCache[photo.id] || null;
    }
    return null;
  };

  const getThumbnailUrl = (photo: Photo): string | null => {
    const baseUrl = getAssetBaseUrl();
    if (photo.source === 'local' && photo.thumbnailPath && photo.thumbnailPath !== '') {
      return `${baseUrl}${photo.thumbnailPath}`;
    }
    // For Immich photos, use blob URL from cache
    if (photo.source === 'immich') {
      return thumbnailCache[photo.id] || null;
    }
    // Fallback to full photo URL
    return getPhotoUrl(photo);
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>No photos yet. Upload some photos to get started!</p>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialogComponent />
      {/* Selection Toolbar */}
      {albums && albums.length > 0 && (
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
                <button
                  onClick={deselectAllPhotos}
                  className="btn btn-secondary"
                >
                  Deselect All
                </button>
              )}
              {currentAlbumId && currentAlbumId > 0 ? (
                <button
                  onClick={handleRemoveFromAlbum}
                  disabled={selectedPhotoIds.size === 0 || isAddingToAlbum}
                  className="btn btn-danger"
                >
                  Remove {selectedPhotoIds.size > 0 ? `${selectedPhotoIds.size} ` : ''}from Album
                </button>
              ) : (
                <button
                  onClick={() => setShowAlbumSelectModal(true)}
                  disabled={selectedPhotoIds.size === 0}
                  className="btn btn-primary"
                >
                  Add {selectedPhotoIds.size > 0 ? `${selectedPhotoIds.size} ` : ''}to Album
                </button>
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedPhotoIds.size} photo{selectedPhotoIds.size !== 1 ? 's' : ''} selected
              </span>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => {
          const thumbnailUrl = getThumbnailUrl(photo);
          const isSelected = selectedPhotoIds.has(photo.id);
          return (
            <div
              key={photo.id}
              className="relative group cursor-pointer aspect-square overflow-hidden rounded-xl bg-parchment dark:bg-navy-800 shadow-md hover:shadow-2xl transition-all duration-300"
              onClick={(e) => selectionMode ? togglePhotoSelection(photo.id, e.shiftKey) : setSelectedPhoto(photo)}
            >
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={photo.caption || 'Photo'}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate/40 dark:text-warm-gray/40">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                  <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shadow-lg transition-all ${
                    isSelected
                      ? 'bg-primary-600 dark:bg-accent-500 border-primary-600 dark:border-accent-500 scale-110'
                      : 'bg-white/90 dark:bg-navy-800/90 border-primary-200 dark:border-navy-700 backdrop-blur-sm hover:border-primary-400 dark:hover:border-accent-400'
                  }`}>
                    {isSelected && (
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setSelectedPhoto(null);
            setIsEditMode(false);
          }}
        >
          <div
            className="max-w-6xl w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {getPhotoUrl(selectedPhoto) ? (
                <img
                  src={getPhotoUrl(selectedPhoto)!}
                  alt={selectedPhoto.caption || 'Photo'}
                  className="w-full max-h-[70vh] object-contain bg-gray-900"
                />
              ) : (
                <div className="w-full h-96 flex items-center justify-center bg-gray-900 text-gray-400">
                  <div className="text-center">
                    <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>Photo not available</p>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedPhoto(null);
                  setIsEditMode(false);
                }}
                className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full w-10 h-10 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {isEditMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Caption
                    </label>
                    <textarea
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      rows={3}
                      className="input"
                      placeholder="Add a caption..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleUpdateCaption}
                      className="btn btn-primary"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedPhoto.caption && (
                    <p className="text-gray-900 dark:text-white">{selectedPhoto.caption}</p>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    {selectedPhoto.location && (
                      <div>
                        <span className="font-medium">Location:</span>{' '}
                        {selectedPhoto.location.name}
                      </div>
                    )}
                    {selectedPhoto.takenAt && (
                      <div>
                        <span className="font-medium">Taken:</span>{' '}
                        {new Date(selectedPhoto.takenAt).toLocaleDateString()}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Source:</span>{' '}
                      {selectedPhoto.source === 'local' ? 'Uploaded' : 'Immich'}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEditCaption(selectedPhoto.caption || '');
                        setIsEditMode(true);
                      }}
                      className="btn btn-secondary"
                    >
                      Edit Caption
                    </button>
                    {onSetCoverPhoto && coverPhotoId !== selectedPhoto.id && (
                      <button
                        type="button"
                        onClick={() => {
                          onSetCoverPhoto(selectedPhoto.id);
                          setSelectedPhoto(null);
                        }}
                        className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 font-medium transition-colors duration-200"
                      >
                        Set as Cover Photo
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedPhoto.id)}
                      className="btn btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Album Selection Modal */}
      {showAlbumSelectModal && albums && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAlbumSelectModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Select Album
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Add {selectedPhotoIds.size} selected photo{selectedPhotoIds.size !== 1 ? 's' : ''} to:
            </p>
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
            <button
              onClick={() => setShowAlbumSelectModal(false)}
              className="mt-4 w-full btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
