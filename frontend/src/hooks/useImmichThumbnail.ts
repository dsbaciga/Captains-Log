import { useState, useEffect, useRef } from 'react';
import { getFullAssetUrl } from '../lib/config';

/**
 * Hook to get an authenticated thumbnail URL for a photo.
 * For Immich photos, fetches with auth and returns a blob URL.
 * For local photos, returns the direct URL.
 *
 * @param thumbnailPath - The thumbnail path from the photo object
 * @param source - The photo source ('local' or 'immich')
 * @returns The URL to use in an img src, or null if not available
 */
export function useImmichThumbnail(
  thumbnailPath: string | null | undefined,
  source: string | null | undefined
): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Cleanup previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (!thumbnailPath) {
      setBlobUrl(null);
      return;
    }

    // For local photos, return direct URL
    if (source === 'local' || !thumbnailPath.includes('/api/immich/')) {
      setBlobUrl(getFullAssetUrl(thumbnailPath));
      return;
    }

    // For Immich photos, fetch with authentication
    const fetchThumbnail = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setBlobUrl(null);
        return;
      }

      try {
        const fullUrl = getFullAssetUrl(thumbnailPath);
        if (!fullUrl) {
          setBlobUrl(null);
          return;
        }

        const response = await fetch(fullUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setBlobUrl(url);
        } else {
          setBlobUrl(null);
        }
      } catch {
        setBlobUrl(null);
      }
    };

    fetchThumbnail();

    // Cleanup on unmount
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [thumbnailPath, source]);

  return blobUrl;
}

/**
 * Hook to manage a cache of authenticated thumbnail URLs for multiple photos.
 * Use this when rendering a list of photos.
 *
 * @returns Object with cache state and loading function
 */
export function useImmichThumbnailCache() {
  const [cache, setCache] = useState<Record<number, string>>({});
  const blobUrlsRef = useRef<string[]>([]);
  const loadingRef = useRef<Set<number>>(new Set());

  const loadThumbnail = async (
    photoId: number,
    thumbnailPath: string | null | undefined,
    source: string | null | undefined
  ): Promise<void> => {
    // Skip if already cached or loading
    if (cache[photoId] || loadingRef.current.has(photoId)) {
      return;
    }

    if (!thumbnailPath) {
      return;
    }

    // For local photos, use direct URL
    if (source === 'local' || !thumbnailPath.includes('/api/immich/')) {
      const url = getFullAssetUrl(thumbnailPath);
      if (url) {
        setCache((prev) => ({ ...prev, [photoId]: url }));
      }
      return;
    }

    // Mark as loading
    loadingRef.current.add(photoId);

    // For Immich photos, fetch with authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
      loadingRef.current.delete(photoId);
      return;
    }

    try {
      const fullUrl = getFullAssetUrl(thumbnailPath);
      if (!fullUrl) {
        loadingRef.current.delete(photoId);
        return;
      }

      const response = await fetch(fullUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        blobUrlsRef.current.push(blobUrl);
        setCache((prev) => ({ ...prev, [photoId]: blobUrl }));
      }
    } catch {
      // Skip failed thumbnails
    } finally {
      loadingRef.current.delete(photoId);
    }
  };

  const loadThumbnails = async (
    photos: Array<{
      id: number;
      thumbnailPath?: string | null;
      source?: string | null;
    }>
  ): Promise<void> => {
    await Promise.all(
      photos.map((photo) =>
        loadThumbnail(photo.id, photo.thumbnailPath, photo.source)
      )
    );
  };

  const getThumbnailUrl = (photoId: number): string | null => {
    return cache[photoId] || null;
  };

  const cleanup = () => {
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
  };

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  return {
    cache,
    loadThumbnail,
    loadThumbnails,
    getThumbnailUrl,
    cleanup,
  };
}

/**
 * Get the appropriate thumbnail URL for a photo.
 * For local photos, returns the direct URL.
 * For Immich photos, returns null (caller should use cached blob URL).
 *
 * @param thumbnailPath - The thumbnail path from the photo object
 * @param source - The photo source ('local' or 'immich')
 * @returns The URL for local photos, or null for Immich photos
 */
export function getLocalThumbnailUrl(
  thumbnailPath: string | null | undefined,
  source: string | null | undefined
): string | null {
  if (!thumbnailPath) {
    return null;
  }

  // For local photos, return direct URL
  if (source === 'local' || !thumbnailPath.includes('/api/immich/')) {
    return getFullAssetUrl(thumbnailPath);
  }

  // For Immich photos, return null (need to use authenticated cache)
  return null;
}

/**
 * Check if a photo is an Immich photo that requires authentication
 */
export function isImmichPhoto(
  thumbnailPath: string | null | undefined,
  source: string | null | undefined
): boolean {
  if (!thumbnailPath) {
    return false;
  }
  return source === 'immich' || thumbnailPath.includes('/api/immich/');
}
