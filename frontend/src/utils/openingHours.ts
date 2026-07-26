/**
 * Presentation helpers for OpenStreetMap `opening_hours` strings.
 *
 * These are display-only. The authoritative parse — and the open/closed verdict that drives
 * the Trip Health Check closure warning — lives in the backend's openingHours.service, which
 * is the single place that decides what the subset means. Anything here that cannot be
 * prettified falls back to showing the raw string verbatim rather than guessing at it.
 */

/** OSM weekday abbreviations mapped to full names for display. */
const WEEKDAY_LABELS: Readonly<Record<string, string>> = {
  mo: 'Monday',
  tu: 'Tuesday',
  we: 'Wednesday',
  th: 'Thursday',
  fr: 'Friday',
  sa: 'Saturday',
  su: 'Sunday',
  ph: 'Public holidays',
  sh: 'School holidays',
};

/** Matches a weekday/holiday token, optionally as the start of a range. */
const DAY_TOKEN_PATTERN = /\b(mo|tu|we|th|fr|sa|su|ph|sh)\b/g;

/** One line of a rendered opening-hours summary. */
export interface OpeningHoursLine {
  /** Days the rule covers, e.g. "Monday-Friday". Empty when the rule has no day selector. */
  days: string;
  /** Times the rule covers, e.g. "09:00-17:00" or "Closed". */
  times: string;
}

/**
 * Split a raw specification into readable day/time lines.
 *
 * `24/7` collapses to a single "Open 24 hours" line. Unrecognised shapes are passed through
 * untouched in the `times` field so the user still sees exactly what is stored.
 */
export function formatOpeningHours(spec: string | null | undefined): OpeningHoursLine[] {
  if (!spec || spec.trim().length === 0) return [];

  const normalized = spec.trim();

  if (normalized.toLowerCase() === '24/7') {
    return [{ days: 'Every day', times: 'Open 24 hours' }];
  }

  return normalized
    .split(';')
    .map((rule) => rule.trim())
    .filter((rule) => rule.length > 0)
    .map((rule) => {
      const separatorIndex = rule.indexOf(' ');

      // No space means a time-only rule ("09:00-17:00") or a bare "off".
      if (separatorIndex === -1) {
        return { days: 'Every day', times: prettifyTimes(rule) };
      }

      const dayPart = rule.slice(0, separatorIndex);
      const timePart = rule.slice(separatorIndex + 1).trim();

      return { days: prettifyDays(dayPart), times: prettifyTimes(timePart) };
    });
}

/** One-line summary suitable for a compact badge or tooltip. */
export function summarizeOpeningHours(spec: string | null | undefined): string {
  const lines = formatOpeningHours(spec);
  if (lines.length === 0) return '';
  return lines.map((line) => (line.days ? `${line.days}: ${line.times}` : line.times)).join(' · ');
}

/** Expand weekday abbreviations, leaving anything unrecognised as-is. */
function prettifyDays(dayPart: string): string {
  return dayPart
    .toLowerCase()
    .replace(DAY_TOKEN_PATTERN, (token) => WEEKDAY_LABELS[token] ?? token)
    .replace(/,/g, ', ');
}

/** Render the time half of a rule, turning `off`/`closed` into a plain word. */
function prettifyTimes(timePart: string): string {
  const lowered = timePart.toLowerCase();
  if (lowered === 'off' || lowered === 'closed') return 'Closed';
  return timePart.replace(/,/g, ', ');
}
