/**
 * Parse duration string (HH:MM:SS or HH:MM:SS.mmm) to seconds
 * Used for parsing Immich duration format
 */
export function parseDuration(duration: string | null | undefined): number | undefined {
  if (!duration) return undefined;
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
