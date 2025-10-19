import { useState, useEffect } from 'react';
import type { Photo, PhotoAlbum } from '../types/photo';
import photoService from '../services/photo.service';

interface PhotoGalleryProps {
  photos: Photo[];
  albums?: PhotoAlbum[];
  onPhotoDeleted?: () => void;
  onPhotoUpdated?: () => void;
  onSetCoverPhoto?: (photoId: number) => void;
  onPhotosAddedToAlbum?: () => void;
  coverPhotoId?: number | null;
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
}: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [thumbnailCache, setThumbnailCache] = useState<ThumbnailCache>({});
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<number>>(new Set());
  const [showAlbumSelectModal, setShowAlbumSelectModal] = useState(false);
  const [isAddingToAlbum, setIsAddingToAlbum] = useState(false);

  // Load thumbnails for Immich photos with authentication
  useEffect(() => {
    const loadThumbnails = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      for (const photo of photos) {
        // Skip if already cached or not an Immich photo
        if (thumbnailCache[photo.id] || photo.source !== 'immich' || !photo.thumbnailPath) {
          continue;
        }

        try {
          const response = await fetch(`http://localhost:5000${photo.thumbnailPath}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            console.error(`Failed to fetch thumbnail for photo ${photo.id}:`, response.status);
            continue;
          }

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          setThumbnailCache(prev => ({
            ...prev,
            [photo.id]: blobUrl,
          }));
        } catch (error) {
          console.error(`Error loading thumbnail for photo ${photo.id}:`, error);
        }
      }
    };

    if (photos.length > 0) {
      loadThumbnails();
    }

    // Cleanup blob URLs when component unmounts or photos list completely changes
    // Don't cleanup on every photos change, only on unmount
    return () => {
      // Only cleanup on unmount, not on every render
    };
  }, [photos]);

  // Cleanup all blob URLs only when component unmounts
  useEffect(() => {
    return () => {
      Object.values(thumbnailCache).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleDelete = async (photoId: number) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

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

  const togglePhotoSelection = (photoId: number) => {
    const newSelection = new Set(selectedPhotoIds);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotoIds(newSelection);
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
      onPhotosAddedToAlbum?.();
      alert(`Successfully added ${selectedPhotoIds.size} photo(s) to album`);
    } catch (error) {
      alert('Failed to add photos to album');
    } finally {
      setIsAddingToAlbum(false);
    }
  };

  const getPhotoUrl = (photo: Photo): string | null => {
    if (photo.source === 'local' && photo.localPath && photo.localPath !== '') {
      return `http://localhost:5000${photo.localPath}`;
    }
    // For Immich photos, use blob URL from cache
    if (photo.source === 'immich') {
      return thumbnailCache[photo.id] || null;
    }
    return null;
  };

  const getThumbnailUrl = (photo: Photo): string | null => {
    if (photo.source === 'local' && photo.thumbnailPath && photo.thumbnailPath !== '') {
      return `http://localhost:5000${photo.thumbnailPath}`;
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
      {/* Selection Toolbar */}
      {albums && albums.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
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
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAlbumSelectModal(true)}
                disabled={selectedPhotoIds.size === 0}
                className="btn btn-primary"
              >
                Add {selectedPhotoIds.size > 0 ? `${selectedPhotoIds.size} ` : ''}to Album
              </button>
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
              className="relative group cursor-pointer aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700"
              onClick={() => selectionMode ? togglePhotoSelection(photo.id) : setSelectedPhoto(photo)}
            >
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={photo.caption || 'Photo'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-sm p-2 truncate">
                  {photo.caption}
                </div>
              )}
              {coverPhotoId === photo.id && (
                <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-medium shadow-lg z-10">
                  Cover Photo
                </div>
              )}
              {photo.location && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                  {photo.location.name}
                </div>
              )}
              {selectionMode && (
                <div className="absolute top-2 left-2">
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  }`}>
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
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
                      className="btn-primary"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="btn-secondary"
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
