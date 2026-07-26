import { useQuery, useQueryClient } from '@tanstack/react-query';
import userService from '../services/user.service';
import { useIsAuthenticated } from '../store/authStore';
import { useIOSDetection } from './useIOSDetection';
import {
  detectMapsPlatform,
  type MapsApp,
  type MapsPlatform,
} from '../lib/mapsDeepLinks';

export const MAPS_PREFERENCE_QUERY_KEY = ['mapsSettings'] as const;

export interface MapsPreferences {
  /** The user's default maps app, or null when they have no preference. */
  preferredApp: MapsApp | null;
  /** Which URL flavour the current device should get. */
  platform: MapsPlatform;
  isLoading: boolean;
}

/**
 * Resolves everything the Directions UI needs: the per-user preferred app
 * (fetched once and shared through TanStack Query, so a page full of cards
 * makes a single request) and the platform to build URLs for.
 */
export function useMapsPreferences(): MapsPreferences {
  const isAuthenticated = useIsAuthenticated();
  const { isIOS } = useIOSDetection();

  const { data, isLoading } = useQuery({
    queryKey: MAPS_PREFERENCE_QUERY_KEY,
    queryFn: () => userService.getMapsSettings(),
    enabled: isAuthenticated,
    // A personal setting that changes at most a handful of times ever.
    staleTime: 60 * 60 * 1000,
  });

  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;

  return {
    preferredApp: data?.preferredMapsApp ?? null,
    platform: detectMapsPlatform({ isIOS, userAgent }),
    isLoading: isAuthenticated && isLoading,
  };
}

/** Invalidate the shared preference cache after saving in Settings. */
export function useInvalidateMapsPreferences(): () => void {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: MAPS_PREFERENCE_QUERY_KEY });
  };
}
