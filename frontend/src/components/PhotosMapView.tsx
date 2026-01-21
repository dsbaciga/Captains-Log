import { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from '@changey/react-leaflet-markercluster';
import { LatLngBounds, LatLng, DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Photo } from '../types/photo';
import { getFullAssetUrl } from '../lib/config';

// Escape URL for safe use in CSS/HTML to prevent XSS
function escapeUrlForCss(url: string): string {
  return url
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

interface PhotosMapViewProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo) => void;
}

// Component to fit map bounds to markers
function MapBoundsHandler({ photos }: { photos: Photo[] }) {
  const map = useMap();

  useEffect(() => {
    if (photos.length === 0) return;

    const validPhotos = photos.filter(
      (p) => p.latitude != null && p.longitude != null
    );
    if (validPhotos.length === 0) return;

    const bounds = new LatLngBounds(
      validPhotos.map((p) => new LatLng(Number(p.latitude), Number(p.longitude)))
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [photos, map]);

  return null;
}

export default function PhotosMapView({ photos, onPhotoClick }: PhotosMapViewProps) {
  const [thumbnailCache, setThumbnailCache] = useState<Record<number, string>>({});
  const blobUrlsRef = useRef<string[]>([]);

  // Filter to photos with coordinates
  const geoPhotos = useMemo(
    () => photos.filter((p) => p.latitude != null && p.longitude != null),
    [photos]
  );

  // Load thumbnails for Immich photos
  useEffect(() => {
    const loadThumbnails = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const immichPhotos = geoPhotos.filter(
        (p) => p.source === 'immich' && p.thumbnailPath && !thumbnailCache[p.id]
      );

      for (const photo of immichPhotos) {
        try {
          const fullUrl = getFullAssetUrl(photo.thumbnailPath);
          if (!fullUrl) continue;

          const response = await fetch(fullUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            blobUrlsRef.current.push(blobUrl);
            setThumbnailCache((prev) => ({ ...prev, [photo.id]: blobUrl }));
          }
        } catch {
          // Skip failed thumbnails
        }
      }
    };

    loadThumbnails();
  }, [geoPhotos, thumbnailCache]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      blobUrlsRef.current = [];
    };
  }, []);

  // Helper to get photo URL
  const getPhotoUrl = (photo: Photo): string | null => {
    if (photo.source === 'local' && photo.thumbnailPath) {
      return getFullAssetUrl(photo.thumbnailPath);
    }
    if (photo.source === 'immich') {
      return thumbnailCache[photo.id] || null;
    }
    if (photo.thumbnailPath) {
      return getFullAssetUrl(photo.thumbnailPath);
    }
    return null;
  };

  // Create custom marker icon with photo thumbnail
  const createPhotoMarker = (photo: Photo): DivIcon => {
    const photoUrl = getPhotoUrl(photo);
    // Escape URL to prevent XSS when injecting into HTML
    const escapedUrl = photoUrl ? escapeUrlForCss(photoUrl) : null;
    const backgroundStyle = escapedUrl
      ? `background-image: url('${escapedUrl}'); background-size: cover; background-position: center;`
      : 'background-color: #9CA3AF;';

    return new DivIcon({
      className: 'photo-marker-icon',
      html: `<div class="w-12 h-12 rounded-full border-3 border-white shadow-lg overflow-hidden ring-2 ring-blue-500" style="${backgroundStyle}"></div>`,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });
  };

  if (geoPhotos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <svg
          className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
          No geotagged photos
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
          Photos with location data will appear on the map
        </p>
      </div>
    );
  }

  // Calculate initial center
  const centerLat = geoPhotos.reduce((sum, p) => sum + Number(p.latitude), 0) / geoPhotos.length;
  const centerLng = geoPhotos.reduce((sum, p) => sum + Number(p.longitude), 0) / geoPhotos.length;

  return (
    <div className="h-64 sm:h-80 md:h-96 lg:h-[500px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={10}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsHandler photos={geoPhotos} />

        <MarkerClusterGroup chunkedLoading>
          {geoPhotos.map((photo) => (
            <Marker
              key={photo.id}
              position={[Number(photo.latitude), Number(photo.longitude)]}
              icon={createPhotoMarker(photo)}
              eventHandlers={{
                click: () => onPhotoClick?.(photo),
              }}
            >
              <Popup>
                <div className="w-48">
                  {getPhotoUrl(photo) ? (
                    <img
                      src={getPhotoUrl(photo) || ''}
                      alt={photo.caption || 'Photo'}
                      className="w-full h-32 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-200 flex items-center justify-center rounded-t-lg">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="p-2">
                    {photo.caption && (
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">
                        {photo.caption}
                      </p>
                    )}
                    {photo.takenAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(photo.takenAt).toLocaleDateString()}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => onPhotoClick?.(photo)}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View full size
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
