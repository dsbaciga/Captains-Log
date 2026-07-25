import { getFullAssetUrl } from './config';
import { getAccessToken } from './axios';

/**
 * The subset of a trip needed to resolve its cover image.
 *
 * A trip's cover comes from one of two mutually exclusive sources:
 * - `coverImagePath` — a standalone image uploaded on the trip edit page. It lives
 *   outside the photo library, so trips with no photos yet can still have a cover.
 * - `coverPhoto` — a photo from the trip's own library, picked via "set as cover".
 *
 * The uploaded image is checked first; the backend clears one whenever the other is set,
 * so at most one is ever present.
 */
export interface TripCoverSource {
  coverImagePath?: string | null;
  coverImageThumbnailPath?: string | null;
  coverPhoto?: {
    localPath: string | null;
    thumbnailPath: string | null;
    source: 'local' | 'immich';
  } | null;
}

export interface ResolvedTripCover {
  url: string | null;
  /**
   * Set when `url` is an object URL the caller must revoke once it is no longer
   * displayed. Only Immich photos, which need an authenticated fetch, produce one.
   */
  blobUrl: string | null;
}

const NO_COVER: ResolvedTripCover = { url: null, blobUrl: null };

/**
 * Resolve a displayable URL for a trip's cover image.
 *
 * @param trip - Trip fields describing the cover
 * @param options.preferThumbnail - Use the smaller rendition where one exists (lists,
 *   cards); full size is used for heroes and banners.
 */
export async function resolveTripCoverUrl(
  trip: TripCoverSource | null | undefined,
  options: { preferThumbnail?: boolean } = {}
): Promise<ResolvedTripCover> {
  if (!trip) return NO_COVER;

  const { preferThumbnail = false } = options;

  // Uploaded cover image — served straight from /uploads, no auth fetch needed
  if (trip.coverImagePath) {
    const source = preferThumbnail
      ? trip.coverImageThumbnailPath || trip.coverImagePath
      : trip.coverImagePath;
    return { url: getFullAssetUrl(source), blobUrl: null };
  }

  const photo = trip.coverPhoto;
  if (!photo) return NO_COVER;

  if (photo.source === 'local') {
    const source = preferThumbnail
      ? photo.thumbnailPath || photo.localPath
      : photo.localPath || photo.thumbnailPath;
    return { url: getFullAssetUrl(source), blobUrl: null };
  }

  // Immich assets are proxied through the API and require the bearer token
  if (photo.source === 'immich' && photo.thumbnailPath) {
    const token = getAccessToken();
    if (!token) return NO_COVER;

    const fullUrl = getFullAssetUrl(photo.thumbnailPath);
    if (!fullUrl) return NO_COVER;

    try {
      const response = await fetch(fullUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return NO_COVER;

      const blobUrl = URL.createObjectURL(await response.blob());
      return { url: blobUrl, blobUrl };
    } catch (error) {
      console.error('Failed to load trip cover photo:', error);
      return NO_COVER;
    }
  }

  return NO_COVER;
}
