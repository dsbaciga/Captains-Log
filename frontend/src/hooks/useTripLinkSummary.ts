import { useQuery, useQueryClient } from '@tanstack/react-query';
import entityLinkService from '../services/entityLink.service';
import type { EntityType, EntityLinkSummary, TripLinkSummary } from '../types/entityLink';
import { getEntityKey } from '../types/entityLink';

/**
 * Hook to fetch and manage link summaries for a trip.
 * Provides link counts for all entities to display badges on LinkButton components.
 */
export function useTripLinkSummary(tripId: number | undefined) {
  const queryClient = useQueryClient();

  const {
    data: summaryMap,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tripLinkSummary', tripId],
    queryFn: () => entityLinkService.getTripLinkSummary(tripId!),
    enabled: !!tripId,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  /**
   * Get the link summary for a specific entity
   */
  const getLinkSummary = (
    entityType: EntityType,
    entityId: number
  ): EntityLinkSummary | undefined => {
    if (!summaryMap) return undefined;
    const key = getEntityKey(entityType, entityId);
    return summaryMap[key];
  };

  /**
   * Invalidate the summary cache to trigger a refetch
   */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tripLinkSummary', tripId] });
  };

  return {
    summaryMap,
    isLoading,
    error,
    refetch,
    getLinkSummary,
    invalidate,
  };
}

export default useTripLinkSummary;
