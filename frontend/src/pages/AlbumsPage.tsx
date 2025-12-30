import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { PhotoAlbum } from '../types/photo';
import photoService from '../services/photo.service';
import { getAssetBaseUrl } from '../lib/config';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

// Import reusable components
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { PhotoIcon } from '../components/icons';

export default function AlbumsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [albumName, setAlbumName] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');

  const getCoverPhotoUrl = (album: PhotoAlbum): string | null => {
    if (!album.coverPhoto) return null;
    const path = album.coverPhoto.thumbnailPath || album.coverPhoto.localPath;
    if (!path || path === '') return null;
    const baseUrl = getAssetBaseUrl();
    return `${baseUrl}${path}`;
  };

  useEffect(() => {
    loadAlbums();
  }, [tripId]);

  const loadAlbums = async () => {
    if (!tripId) return;

    try {
      const data = await photoService.getAlbumsByTrip(parseInt(tripId));
      setAlbums(data.albums);
    } catch (err) {
      console.error('Failed to load albums:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripId || !albumName.trim()) return;

    try {
      await photoService.createAlbum({
        tripId: parseInt(tripId),
        name: albumName,
        description: albumDescription || undefined,
      });

      setAlbumName('');
      setAlbumDescription('');
      setShowCreateForm(false);
      loadAlbums();
    } catch {
      alert('Failed to create album');
    }
  };

  const handleDeleteAlbum = async (albumId: number) => {
    const confirmed = await confirm({
      title: 'Delete Album',
      message: 'Are you sure you want to delete this album? Photos will not be deleted.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    try {
      await photoService.deleteAlbum(albumId);
      loadAlbums();
    } catch {
      alert('Failed to delete album');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <LoadingSpinner.FullPage message="Loading albums..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <PageHeader
          title="Photo Albums"
          backLink={{ label: "← Back to Trip", href: `/trips/${tripId}` }}
          action={{
            label: showCreateForm ? 'Cancel' : '+ Create Album',
            onClick: () => setShowCreateForm(!showCreateForm),
          }}
        />

        {showCreateForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create New Album</h2>
            <form onSubmit={handleCreateAlbum} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Album Name *
                </label>
              <input
                type="text"
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                className="input"
                placeholder="Summer Adventures"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={albumDescription}
                onChange={(e) => setAlbumDescription(e.target.value)}
                rows={3}
                className="input"
                placeholder="A collection of our best summer moments..."
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Create Album
            </button>
          </form>
        </div>
      )}

      {albums.length === 0 ? (
        <EmptyState
          icon="📸"
          message="No albums yet"
          subMessage="Create your first album to organize your photos!"
          actionLabel="+ Create Album"
          onAction={() => setShowCreateForm(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album) => (
            <div
              key={album.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div
                className="h-48 bg-gray-200 dark:bg-gray-700 cursor-pointer"
                onClick={() => navigate(`/trips/${tripId}/albums/${album.id}`)}
              >
                {getCoverPhotoUrl(album) ? (
                  <img
                    src={getCoverPhotoUrl(album)!}
                    alt={album.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <PhotoIcon className="w-16 h-16" />
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3
                  className="font-semibold text-lg text-gray-900 dark:text-white mb-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 break-words line-clamp-2"
                  onClick={() => navigate(`/trips/${tripId}/albums/${album.id}`)}
                >
                  {album.name}
                </h3>
                {album.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2 break-words">
                    {album.description}
                  </p>
                )}
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  {album._count?.photoAssignments || 0} photos
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/trips/${tripId}/albums/${album.id}`)}
                    className="btn btn-secondary flex-1"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteAlbum(album.id)}
                    className="btn btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        <ConfirmDialogComponent />
      </div>
    </div>
  );
}
