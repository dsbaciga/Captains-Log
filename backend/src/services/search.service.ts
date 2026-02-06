import prisma from '../config/database';
import { GlobalSearchQuery, SearchResult } from '../types/search.types';
import { convertDecimals } from '../utils/serviceHelpers';
import { signUploadPath } from '../utils/signedUrl';

export class SearchService {
  async globalSearch(userId: number, query: GlobalSearchQuery) {
    const { q, type, limit: limitStr } = query;
    const limit = parseInt(limitStr);

    // When searching all types, fetch proportionally from each to avoid over-fetching
    // We fetch slightly more per type to handle uneven distribution
    const entityTypes = ['trip', 'location', 'journal', 'photo'];
    const perTypeLimit = type === 'all'
      ? Math.ceil(limit / entityTypes.length) + 2  // +2 buffer for uneven distribution
      : limit;

    const results: SearchResult[] = [];

    // Search for trips
    if (type === 'all' || type === 'trip') {
      const trips = await prisma.trip.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: perTypeLimit,
        orderBy: { updatedAt: 'desc' },
      });

      trips.forEach((trip) => {
        results.push({
          id: trip.id,
          type: 'trip',
          title: trip.title,
          subtitle: trip.status,
          url: `/trips/${trip.id}`,
          date: trip.startDate?.toISOString(),
        });
      });
    }

    // Search for locations
    if (type === 'all' || type === 'location') {
      const locations = await prisma.location.findMany({
        where: {
          trip: { userId },
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: perTypeLimit,
        include: { trip: true },
        orderBy: { updatedAt: 'desc' },
      });

      locations.forEach((loc) => {
        results.push({
          id: loc.id,
          type: 'location',
          title: loc.name,
          subtitle: `Trip: ${loc.trip.title}`,
          url: `/trips/${loc.tripId}#locations`,
          date: loc.visitDatetime?.toISOString(),
        });
      });
    }

    // Search for journal entries
    if (type === 'all' || type === 'journal') {
      const journals = await prisma.journalEntry.findMany({
        where: {
          trip: { userId },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: perTypeLimit,
        include: { trip: true },
        orderBy: { updatedAt: 'desc' },
      });

      journals.forEach((journal) => {
        results.push({
          id: journal.id,
          type: 'journal',
          title: journal.title || 'Untitled Journal Entry',
          subtitle: `Trip: ${journal.trip.title}`,
          url: `/trips/${journal.tripId}/journals/${journal.id}`,
          date: journal.date?.toISOString(),
        });
      });
    }

    // Search for photos
    if (type === 'all' || type === 'photo') {
      const photos = await prisma.photo.findMany({
        where: {
          trip: { userId },
          caption: { contains: q, mode: 'insensitive' },
        },
        take: perTypeLimit,
        include: { trip: true },
        orderBy: { updatedAt: 'desc' },
      });

      photos.forEach((photo) => {
        results.push({
          id: photo.id,
          type: 'photo',
          title: photo.caption || 'Unnamed Photo',
          subtitle: `Trip: ${photo.trip.title}`,
          url: `/trips/${photo.tripId}/photos/${photo.id}`,
          thumbnail: signUploadPath(photo.thumbnailPath || photo.localPath) || undefined,
          date: photo.takenAt?.toISOString(),
        });
      });
    }

    // Sort results by date (if available) or byUpdatedAt (implicitly handled by database queries per entity)
    // For a truly global search, we might want to sort combined results by some timestamp
    const sortedResults = results.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    }).slice(0, limit);

    return {
      results: convertDecimals(sortedResults),
      total: sortedResults.length,
    };
  }
}

export default new SearchService();

