import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Returns a function that refreshes every cached entity-link query for a trip.
 *
 * A link always has two ends. Invalidating only the entity the user acted on
 * leaves the counterpart's `['entityLinks', tripId, type, id]` cache untouched,
 * and because the client sets a 5-minute `staleTime` with
 * `refetchOnWindowFocus` disabled (`lib/queryClientSetup.ts`), a mounted
 * LinkedEntitiesDisplay on the other side keeps rendering the old list — the
 * new link appears to have vanished. Query keys match by prefix, so passing
 * `['entityLinks', tripId]` refreshes both ends at once.
 *
 * The trip-wide link summary drives the LinkButton badges and is invalidated
 * alongside it, since the same mutation changes both.
 *
 * @example
 * ```tsx
 * const invalidateEntityLinks = useInvalidateEntityLinks();
 * await entityLinkService.createLink(tripId, { ... });
 * invalidateEntityLinks(tripId);
 * ```
 */
export function useInvalidateEntityLinks() {
  const queryClient = useQueryClient();

  return useCallback(
    (tripId: number) => {
      queryClient.invalidateQueries({ queryKey: ['entityLinks', tripId] });
      queryClient.invalidateQueries({ queryKey: ['tripLinkSummary', tripId] });
    },
    [queryClient]
  );
}

export default useInvalidateEntityLinks;
