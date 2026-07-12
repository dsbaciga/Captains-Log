/**
 * Parse duration to seconds.
 * Used for parsing Immich duration format, which is documented as a
 * "HH:MM:SS.sss" string but has been observed coming back as a plain number
 * of seconds (or omitted) from some server versions/endpoints — handle both
 * so a shape mismatch doesn't crash the caller.
 */
export function parseDuration(
  duration: string | number | null | undefined
): number | undefined {
  if (duration === null || duration === undefined || duration === "") return undefined;
  if (typeof duration === "number") {
    return Number.isFinite(duration) ? Math.round(duration) : undefined;
  }
  const match = duration.match(/^(\d+):(\d+):(\d+)(?:\.\d+)?$/);
  if (!match) return undefined;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format duration in seconds to HH:MM:SS or MM:SS format
 * Used for displaying video duration in UI
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}
