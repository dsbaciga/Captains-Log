import prisma from '../config/database';
import { GlobalSearchQuery, SearchResult } from '../types/search.types';
import { convertDecimals } from '../utils/serviceHelpers';

export class SearchService {
  async globalSearch(userId: number, query: GlobalSearchQuery) {
    const { q, type, limit: limitStr } = query;
    const limit = parseInt(limitStr);

    // When searching all types, fetch proportionally from each to avoid over-fetching
    // We fetch slightly more per type to handle uneven distribution
    const entityTypes = ['trip', 'location', 'journal', 'photo', 'trip-series'];
    const perTypeLimit = type === 'all'
      ? Math.ceil(limit / entityTypes.length) + 2  // +2 buffer for uneven distribution
      : limit;

    // Build array of query promises based on requested type(s)
    // Execute all queries in parallel for better performance
    const queryPromises: Promise<SearchResult[]>[] = [];

    // Search for trips
    if (type === 'all' || type === 'trip') {
      queryPromises.push(
        prisma.trip.findMany({
          where: {
            userId,
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { tripType: { contains: q, mode: 'insensitive' } },
            ],
          },
          take: perTypeLimit,
          orderBy: { updatedAt: 'desc' },
        }).then((trips) =>
          trips.map((trip) => ({
            id: trip.id,
            type: 'trip' as const,
            title: trip.title,
            subtitle: [trip.status, trip.tripType].filter(Boolean).join(' · '),
            url: `/trips/${trip.id}`,
            date: trip.startDate?.toISOString(),
          }))
        )
      );
    }

    // Search for locations
    if (type === 'all' || type === 'location') {
      queryPromises.push(
        prisma.location.findMany({
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
        }).then((locations) =>
          locations.map((loc) => ({
            id: loc.id,
            type: 'location' as const,
            title: loc.name,
            subtitle: `Trip: ${loc.trip.title}`,
            url: `/trips/${loc.tripId}#locations`,
            date: loc.visitDatetime?.toISOString(),
          }))
        )
      );
    }

    // Search for journal entries
    if (type === 'all' || type === 'journal') {
      queryPromises.push(
        prisma.journalEntry.findMany({
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
        }).then((journals) =>
          journals.map((journal) => ({
            id: journal.id,
            type: 'journal' as const,
            title: journal.title || 'Untitled Journal Entry',
            subtitle: `Trip: ${journal.trip.title}`,
            url: `/trips/${journal.tripId}/journals/${journal.id}`,
            date: journal.date?.toISOString(),
          }))
        )
      );
    }

    // Search for photos
    if (type === 'all' || type === 'photo') {
      queryPromises.push(
        prisma.photo.findMany({
          where: {
            trip: { userId },
            caption: { contains: q, mode: 'insensitive' },
          },
          take: perTypeLimit,
          include: { trip: true },
          orderBy: { updatedAt: 'desc' },
        }).then((photos) =>
          photos.map((photo) => ({
            id: photo.id,
            type: 'photo' as const,
            title: photo.caption || 'Unnamed Photo',
            subtitle: `Trip: ${photo.trip.title}`,
            url: `/trips/${photo.tripId}/photos/${photo.id}`,
            thumbnail: photo.thumbnailPath || photo.localPath || undefined,
            date: photo.takenAt?.toISOString(),
          }))
        )
      );
    }

    // Search for trip series
    if (type === 'all' || type === 'trip-series') {
      queryPromises.push(
        prisma.tripSeries.findMany({
          where: {
            userId,
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          },
          take: perTypeLimit,
          include: {
            _count: { select: { trips: true } },
          },
          orderBy: { updatedAt: 'desc' },
        }).then((series) =>
          series.map((s) => ({
            id: s.id,
            type: 'trip-series' as const,
            title: s.name,
            subtitle: `${s._count.trips} trip${s._count.trips !== 1 ? 's' : ''}`,
            url: `/trip-series/${s.id}`,
            date: s.updatedAt?.toISOString(),
          }))
        )
      );
    }

    // Execute all queries in parallel and flatten results
    const resultArrays = await Promise.all(queryPromises);
    const results = resultArrays.flat();

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

