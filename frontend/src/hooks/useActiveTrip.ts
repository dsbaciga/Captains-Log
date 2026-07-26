import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router';
import tripService from '../services/trip.service';
import { TripStatus } from '../types/trip';
import type { Trip } from '../types/trip';

/**
 * Rank a trip by how likely it is to be the one the user wants to log against.
 * Lower sorts first. Trips outside these statuses are never candidates.
 */
const STATUS_RANK: Partial<Record<Trip['status'], number>> = {
  [TripStatus.IN_PROGRESS]: 0,
  [TripStatus.PLANNED]: 1,
  [TripStatus.PLANNING]: 2,
};

/**
 * Pick the trip a capture should attach to: an in-progress trip if there is
 * one, otherwise the soonest planned/planning trip. Ties break on the earlier
 * start date, and undated trips sort last within their status.
 */
function pickActiveTrip(trips: Trip[]): Trip | null {
  const candidates = trips.filter(
    (trip) => !trip.archived && STATUS_RANK[trip.status] !== undefined
  );
  if (candidates.length === 0) return null;

  return candidates.reduce((best, trip) => {
    const bestRank = STATUS_RANK[best.status] ?? Number.MAX_SAFE_INTEGER;
    const tripRank = STATUS_RANK[trip.status] ?? Number.MAX_SAFE_INTEGER;
    if (tripRank !== bestRank) return tripRank < bestRank ? trip : best;

    const bestStart = best.startDate ? Date.parse(best.startDate) : Number.MAX_SAFE_INTEGER;
    const tripStart = trip.startDate ? Date.parse(trip.startDate) : Number.MAX_SAFE_INTEGER;
    return tripStart < bestStart ? trip : best;
  });
}

/**
 * Day-of-trip for a trip that has started, 1-indexed, or null when the trip has
 * no start date or has not begun. Trip start/end are `@db.Date` values stored at
 * UTC midnight, so the day boundary is compared in UTC deliberately — see the
 * date-only exception in CLAUDE.md.
 */
export function getDayOfTrip(trip: Trip | null | undefined, now: Date = new Date()): number | null {
  if (!trip?.startDate) return null;

  const start = Date.parse(trip.startDate.split('T')[0] + 'T00:00:00Z');
  if (Number.isNaN(start)) return null;

  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const day = Math.floor((today - start) / 86_400_000) + 1;
  return day >= 1 ? day : null;
}

/** Total nights a trip spans, or null when either end of the range is unset. */
export function getTripLength(trip: Trip | null | undefined): number | null {
  if (!trip?.startDate || !trip?.endDate) return null;

  const start = Date.parse(trip.startDate.split('T')[0] + 'T00:00:00Z');
  const end = Date.parse(trip.endDate.split('T')[0] + 'T00:00:00Z');
  if (Number.isNaN(start) || Number.isNaN(end)) return null;

  return Math.floor((end - start) / 86_400_000) + 1;
}

/**
 * The trip a capture should be filed under.
 *
 * When the user is already inside a trip, that trip wins — logging from a trip
 * screen must never file the entry against a different trip. Everywhere else it
 * falls back to the in-progress (or soonest upcoming) trip so capture works
 * from the dashboard without first navigating.
 */
export function useActiveTrip(
  options: { enabled?: boolean } = {}
): { trip: Trip | null; isLoading: boolean } {
  // Callers mounted outside ProtectedRoute (the mobile shell) must pass
  // `enabled` so this does not fire an authenticated request on the login page.
  const { enabled = true } = options;

  // Read the trip id off the path rather than via useParams: the mobile shell
  // mounts this hook outside <Routes>, where there is no matched route to read
  // params from.
  const { pathname } = useLocation();
  const routeTripId = pathname.match(/^\/trips\/(\d+)(?:\/|$)/)?.[1] ?? null;

  const { data: trips, isLoading: isListLoading } = useQuery({
    queryKey: ['trips', 'active-candidates'],
    queryFn: async () => {
      const response = await tripService.getTrips({ limit: 50, sort: 'startDate-asc' });
      return response.trips;
    },
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  const fromRoute = routeTripId
    ? trips?.find((trip) => trip.id === Number(routeTripId)) ?? null
    : null;

  // Inside a trip route the trip may not be in the candidate page (archived,
  // completed, or past the 50-trip window). Fetch it directly in that case so
  // the sheet still names the right target.
  const needsDirectFetch = enabled && Boolean(routeTripId) && !fromRoute && !isListLoading;
  const { data: routeTrip, isLoading: isRouteLoading } = useQuery({
    queryKey: ['trip', Number(routeTripId)],
    queryFn: () => tripService.getTripById(Number(routeTripId)),
    enabled: needsDirectFetch && Number.isFinite(Number(routeTripId)),
  });

  if (routeTripId) {
    return {
      trip: fromRoute ?? routeTrip ?? null,
      isLoading: isListLoading || isRouteLoading,
    };
  }

  return {
    trip: trips ? pickActiveTrip(trips) : null,
    isLoading: isListLoading,
  };
}
