import prisma from '../config/database';
import type { Photo } from '@prisma/client';

interface AlbumSuggestion {
  name: string;
  photoIds: number[];
  type: 'date' | 'location';
  confidence: number;
  metadata: {
    date?: string;
    locationName?: string;
    locationId?: number;
  };
}

// Helper to calculate distance between two coordinates in meters (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Group photos by time window (2 hours)
function groupPhotosByTime(photos: Photo[]): Map<string, Photo[]> {
  const groups = new Map<string, Photo[]>();
  const TIME_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

  // Sort photos by time
  const sortedPhotos = [...photos].sort((a, b) => {
    const timeA = a.takenAt ? new Date(a.takenAt).getTime() : 0;
    const timeB = b.takenAt ? new Date(b.takenAt).getTime() : 0;
    return timeA - timeB;
  });

  let currentGroup: Photo[] = [];
  let groupStartTime = 0;

  for (const photo of sortedPhotos) {
    if (!photo.takenAt) continue;

    const photoTime = new Date(photo.takenAt).getTime();

    if (currentGroup.length === 0) {
      currentGroup.push(photo);
      groupStartTime = photoTime;
    } else if (photoTime - groupStartTime <= TIME_WINDOW_MS) {
      currentGroup.push(photo);
    } else {
      // Start new group
      if (currentGroup.length >= 3) {
        const date = new Date(groupStartTime).toISOString().split('T')[0];
        const key = `date-${date}-${groupStartTime}`;
        groups.set(key, currentGroup);
      }
      currentGroup = [photo];
      groupStartTime = photoTime;
    }
  }

  // Don't forget the last group
  if (currentGroup.length >= 3) {
    const date = new Date(groupStartTime).toISOString().split('T')[0];
    const key = `date-${date}-${groupStartTime}`;
    groups.set(key, currentGroup);
  }

  return groups;
}

// Group photos by location (500m radius)
function groupPhotosByLocation(photos: Photo[]): Map<string, Photo[]> {
  const groups = new Map<string, Photo[]>();
  const LOCATION_RADIUS_M = 500; // 500 meters

  const geoPhotos = photos.filter(
    (p) => p.latitude != null && p.longitude != null
  );

  // Simple clustering - iterate and group
  const assigned = new Set<number>();

  for (const photo of geoPhotos) {
    if (assigned.has(photo.id)) continue;

    const cluster: Photo[] = [photo];
    assigned.add(photo.id);

    const lat1 = Number(photo.latitude);
    const lng1 = Number(photo.longitude);

    for (const other of geoPhotos) {
      if (assigned.has(other.id)) continue;

      const lat2 = Number(other.latitude);
      const lng2 = Number(other.longitude);

      const distance = calculateDistance(lat1, lng1, lat2, lng2);
      if (distance <= LOCATION_RADIUS_M) {
        cluster.push(other);
        assigned.add(other.id);
      }
    }

    if (cluster.length >= 3) {
      const key = `location-${lat1.toFixed(4)}-${lng1.toFixed(4)}`;
      groups.set(key, cluster);
    }
  }

  return groups;
}

// Format a date for album name
function formatDateForAlbumName(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
}

export const albumSuggestionService = {
  /**
   * Get album suggestions for a trip based on photo clustering
   */
  async getAlbumSuggestions(userId: number, tripId: number): Promise<AlbumSuggestion[]> {
    // Verify user owns the trip
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new Error('Trip not found');
    }

    // Get all photos for this trip that are not already in an album
    const photos = await prisma.photo.findMany({
      where: {
        tripId,
        albumAssignments: { none: {} }, // Only unsorted photos
      },
    });

    if (photos.length < 3) {
      return [];
    }

    const suggestions: AlbumSuggestion[] = [];

    // Group by date/time
    const dateGroups = groupPhotosByTime(photos);
    for (const groupPhotos of dateGroups.values()) {
      if (groupPhotos.length < 3) continue;

      const firstPhoto = groupPhotos[0];
      const date = firstPhoto.takenAt ? new Date(firstPhoto.takenAt) : new Date();
      const formattedDate = formatDateForAlbumName(date);

      suggestions.push({
        name: formattedDate,
        photoIds: groupPhotos.map((p) => p.id),
        type: 'date',
        confidence: Math.min(0.5 + groupPhotos.length * 0.1, 0.95),
        metadata: {
          date: date.toISOString().split('T')[0],
        },
      });
    }

    // Group by location
    const locationGroups = groupPhotosByLocation(photos);
    for (const groupPhotos of locationGroups.values()) {
      if (groupPhotos.length < 3) continue;

      // Use coordinates to generate a location name
      const firstPhoto = groupPhotos[0];
      const lat = Number(firstPhoto.latitude).toFixed(2);
      const lng = Number(firstPhoto.longitude).toFixed(2);
      const locationName = `Location (${lat}, ${lng})`;

      suggestions.push({
        name: locationName,
        photoIds: groupPhotos.map((p) => p.id),
        type: 'location',
        confidence: Math.min(0.4 + groupPhotos.length * 0.1, 0.9),
        metadata: {
          locationName,
        },
      });
    }

    // Sort by confidence descending
    suggestions.sort((a, b) => b.confidence - a.confidence);

    // Return top 5 suggestions
    return suggestions.slice(0, 5);
  },

  /**
   * Accept a suggestion and create an album
   */
  async acceptSuggestion(
    userId: number,
    tripId: number,
    suggestion: { name: string; photoIds: number[] }
  ): Promise<{ albumId: number }> {
    // Verify user owns the trip
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new Error('Trip not found');
    }

    // Verify all photos belong to this trip (authorization check)
    const photosCount = await prisma.photo.count({
      where: {
        id: { in: suggestion.photoIds },
        tripId: tripId,
      },
    });

    if (photosCount !== suggestion.photoIds.length) {
      throw new Error('Some photos do not belong to this trip');
    }

    // Create the album
    const album = await prisma.photoAlbum.create({
      data: {
        name: suggestion.name,
        tripId,
        photoAssignments: {
          create: suggestion.photoIds.map((photoId, index) => ({
            photoId,
            position: index,
          })),
        },
      },
    });

    return { albumId: album.id };
  },
};

export default albumSuggestionService;
