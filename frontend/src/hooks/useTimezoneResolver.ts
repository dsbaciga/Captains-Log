import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { resolveTimezone } from '../utils/timezone';

/**
 * Returns a function that resolves the timezone a time should be displayed in.
 *
 * Pass the candidates from most to least specific — the entity's own timezone,
 * then its trip's — and the signed-in user's configured timezone is appended
 * as the final fallback, then the browser's. The result is that a user always
 * sees times on their own clock unless something more specific says otherwise.
 *
 * Returned as a function rather than a value so it can be called inside event
 * handlers and submit paths, where most of these resolutions happen.
 *
 * @example
 * const resolveTz = useTimezoneResolver();
 * const effectiveTz = resolveTz(activity.timezone, tripTimezone);
 */
export function useTimezoneResolver() {
  const userTimezone = useAuthStore((state) => state.user?.timezone);

  return useCallback(
    (...candidates: Array<string | null | undefined>) =>
      resolveTimezone(...candidates, userTimezone),
    [userTimezone]
  );
}

export default useTimezoneResolver;
