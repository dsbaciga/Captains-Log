import prisma from '../../config/database';

/**
 * Server-side timezone resolution: picking the zone a date should be bucketed
 * or formatted in, and reading the user's configured zone.
 */

/**
 * Last-resort timezone. Unlike the client, the server has no browser zone to
 * fall back on, so this is only reached when the user has never set one.
 */
export const FALLBACK_TIMEZONE = 'UTC';

/**
 * Picks the first timezone that was actually specified.
 *
 * Mirrors the client's `resolveTimezone` so both sides bucket dates the same
 * way: the most specific zone wins, and the user's own zone is the intended
 * final candidate — pass it explicitly (see `getUserTimezone`).
 */
export function resolveTimezone(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed;
  }
  return FALLBACK_TIMEZONE;
}

/**
 * The user's configured timezone, or null when they have never set one.
 *
 * Used by read paths that group or format dates for a specific user, so a
 * request that omits an explicit timezone still answers on that user's clock
 * instead of UTC.
 */
export async function getUserTimezone(userId: number): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  return user?.timezone ?? null;
}
