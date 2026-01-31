import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Photo } from '../types/photo';
import type { Location } from '../types/location';
import type { EntityType } from '../types/entityLink';
import locationService from '../services/location.service';
import entityLinkService from '../services/entityLink.service';

// Location source types for visual differentiation
export type LocationSource = 'exif' | 'linked_location' | 'album_location';

// Resolved location with source information
export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  source: LocationSource;
  locationName?: string;
  locationId?: number;
}

// Photo extended with resolved location
export interface PhotoWithResolvedLocation extends Photo {
  resolvedLocation: ResolvedLocation | null;
}

// Stats for location resolution
export interface LocationResolutionStats {
  exif: number;
  linkedLocation: number;
  albumLocation: number;
  noLocation: number;
  total: number;
}

// Link data from getLinksByTargetType
interface EntityLinkData {
  sourceType: EntityType;
  sourceId: number;
  targetId: number;
}

/**
 * Resolves photo locations using a priority chain:
 * 1. EXIF coordinates (embedded GPS data)
 * 2. Direct entity link (photo linked to location)
 * 3. Album link (photo's album linked to location)
 * 4. No location (excluded from map)
 */
function resolvePhotoLocations(
  photos: Photo[],
  locations: Location[] | undefined,
  links: EntityLinkData[] | undefined
): PhotoWithResolvedLocation[] {
  if (!locations || !links) {
    // If data not loaded yet, just check EXIF
    return photos.map((photo) => ({
      ...photo,
      resolvedLocation:
        photo.latitude != null && photo.longitude != null
          ? {
              latitude: Number(photo.latitude),
              longitude: Number(photo.longitude),
              source: 'exif' as const,
            }
          : null,
    }));
  }

  // Build location lookup map
  const locationMap = new Map<number, Location>(locations.map((loc) => [loc.id, loc]));

  // Build photo -> location link map
  const photoToLocationMap = new Map<number, number>();
  // Build album -> location link map
  const albumToLocationMap = new Map<number, number>();

  for (const link of links) {
    if (link.sourceType === 'PHOTO') {
      // Only store first link per photo (in case of multiple)
      if (!photoToLocationMap.has(link.sourceId)) {
        photoToLocationMap.set(link.sourceId, link.targetId);
      }
    } else if (link.sourceType === 'PHOTO_ALBUM') {
      // Only store first link per album (in case of multiple)
      if (!albumToLocationMap.has(link.sourceId)) {
        albumToLocationMap.set(link.sourceId, link.targetId);
      }
    }
  }

  return photos.map((photo) => {
    // Priority 1: EXIF coordinates
    if (photo.latitude != null && photo.longitude != null) {
      return {
        ...photo,
        resolvedLocation: {
          latitude: Number(photo.latitude),
          longitude: Number(photo.longitude),
          source: 'exif' as const,
        },
      };
    }

    // Priority 2: Photo directly linked to Location
    const linkedLocationId = photoToLocationMap.get(photo.id);
    if (linkedLocationId != null) {
      const location = locationMap.get(linkedLocationId);
      if (location?.latitude != null && location?.longitude != null) {
        return {
          ...photo,
          resolvedLocation: {
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
            source: 'linked_location' as const,
            locationName: location.name,
            locationId: location.id,
          },
        };
      }
    }

    // Priority 3: Photo's album linked to Location
    if (photo.albums && photo.albums.length > 0) {
      for (const albumAssignment of photo.albums) {
        const albumLocationId = albumToLocationMap.get(albumAssignment.album.id);
        if (albumLocationId != null) {
          const location = locationMap.get(albumLocationId);
          if (location?.latitude != null && location?.longitude != null) {
            return {
              ...photo,
              resolvedLocation: {
                latitude: Number(location.latitude),
                longitude: Number(location.longitude),
                source: 'album_location' as const,
                locationName: location.name,
                locationId: location.id,
              },
            };
          }
        }
      }
    }

    // No location resolved
    return {
      ...photo,
      resolvedLocation: null,
    };
  });
}

/**
 * Calculate stats from resolved photos
 */
function calculateStats(photos: PhotoWithResolvedLocation[]): LocationResolutionStats {
  const stats: LocationResolutionStats = {
    exif: 0,
    linkedLocation: 0,
    albumLocation: 0,
    noLocation: 0,
    total: photos.length,
  };

  for (const photo of photos) {
    if (!photo.resolvedLocation) {
      stats.noLocation++;
    } else {
      switch (photo.resolvedLocation.source) {
        case 'exif':
          stats.exif++;
          break;
        case 'linked_location':
          stats.linkedLocation++;
          break;
        case 'album_location':
          stats.albumLocation++;
          break;
      }
    }
  }

  return stats;
}

interface UsePhotoLocationsOptions {
  enabled?: boolean;
}

interface UsePhotoLocationsResult {
  photosWithLocations: PhotoWithResolvedLocation[];
  geotaggedPhotos: PhotoWithResolvedLocation[];
  stats: LocationResolutionStats;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Hook to resolve photo locations using the priority chain:
 * EXIF → Direct Link → Album Link → No Location
 *
 * @param tripId - The trip ID to fetch locations and links for
 * @param photos - Array of photos to resolve locations for
 * @param options - Hook options
 */
export function usePhotoLocations(
  tripId: number,
  photos: Photo[],
  options: UsePhotoLocationsOptions = {}
): UsePhotoLocationsResult {
  const { enabled = true } = options;

  // Fetch trip locations (stable per trip)
  const {
    data: locations,
    isLoading: locationsLoading,
    isError: locationsError,
  } = useQuery({
    queryKey: ['locations', tripId],
    queryFn: () => locationService.getLocationsByTrip(tripId),
    enabled: enabled && tripId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch entity links to locations (stable per trip)
  const {
    data: links,
    isLoading: linksLoading,
    isError: linksError,
  } = useQuery({
    queryKey: ['entity-links', tripId, 'LOCATION'],
    queryFn: () => entityLinkService.getLinksByTargetType(tripId, 'LOCATION'),
    enabled: enabled && tripId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Resolve photo locations (memoized)
  const photosWithLocations = useMemo(
    () => resolvePhotoLocations(photos, locations, links),
    [photos, locations, links]
  );

  // Filter to only photos with resolved locations
  const geotaggedPhotos = useMemo(
    () => photosWithLocations.filter((p) => p.resolvedLocation != null),
    [photosWithLocations]
  );

  // Calculate stats (memoized)
  const stats = useMemo(() => calculateStats(photosWithLocations), [photosWithLocations]);

  return {
    photosWithLocations,
    geotaggedPhotos,
    stats,
    isLoading: locationsLoading || linksLoading,
    isError: locationsError || linksError,
  };
}

export default usePhotoLocations;
