import { stripTrackingParams } from './linkMetadata.service';

/**
 * Extracts candidate saved-link URLs from a forwarded email.
 *
 * Deliberately pure and I/O-free: marketing email is hostile input, so this is
 * the part that carries real test coverage. Network access (SSRF validation,
 * metadata scraping) happens later in emailIngest.service.
 */

/**
 * Hosts that only ever carry list infrastructure, click tracking, or embedded
 * assets. Matched against the hostname as a suffix or exact match.
 */
const DENYLISTED_HOST_FRAGMENTS = [
  // ESP click/redirect wrappers
  'list-manage.com',
  'sendgrid.net',
  'mandrillapp.com',
  'sparkpostmail.com',
  'mailgun.org',
  'sendinblue.com',
  'cmail19.com',
  'createsend.com',
  'exacttarget.com',
  'mcsv.net',
  'rs6.net',
  // Ad / analytics
  'doubleclick.net',
  'googleadservices.com',
  'google-analytics.com',
  'googletagmanager.com',
  'scorecardresearch.com',
  'branch.io',
  // Asset/CDN hosts that show up as <img> wrappers, never as content
  'googleusercontent.com',
  'gstatic.com',
  'cloudfront.net',
  'imgix.net',
];

/**
 * Path or host substrings that mark a URL as plumbing rather than content.
 * `open` and `pixel` catch tracking beacons; `unsubscribe`/`preferences` catch
 * list-management footers.
 */
const DENYLISTED_PATH_FRAGMENTS = [
  'unsubscribe',
  'optout',
  'opt-out',
  'preferences',
  'manage-subscription',
  'emailpreferences',
  '/track',
  '/click',
  '/beacon',
  '/pixel',
  '/open',
  '/wf/open',
];

/** File extensions that are assets, not pages worth saving. */
const ASSET_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.css',
  '.js',
  '.woff',
  '.woff2',
];

/** Matches bare URLs in plain-text bodies. */
const PLAIN_TEXT_URL_PATTERN = /https?:\/\/[^\s<>"'`\]),]+/gi;

/** Matches href attribute values in HTML bodies. */
const HREF_PATTERN = /<a\b[^>]*?href\s*=\s*["']([^"']+)["']/gi;

/**
 * Trailing characters that are almost always sentence punctuation rather than
 * part of the URL. Applied only to plain-text matches.
 */
function trimTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!?]+$/, '');
}

/** Decodes the entities that realistically appear inside an href. */
function decodeHrefEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function isDenylisted(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();

  const hostBlocked = DENYLISTED_HOST_FRAGMENTS.some(
    (fragment) => hostname === fragment || hostname.endsWith(`.${fragment}`)
  );
  if (hostBlocked) return true;

  // Compare against host+path so `click.example.com` is caught alongside
  // `example.com/click/123`.
  const haystack = `${hostname}${url.pathname}`.toLowerCase();
  if (DENYLISTED_PATH_FRAGMENTS.some((fragment) => haystack.includes(fragment))) {
    return true;
  }

  const path = url.pathname.toLowerCase();
  if (ASSET_EXTENSIONS.some((ext) => path.endsWith(ext))) return true;

  return false;
}

/**
 * Normalises a raw candidate into a storable URL, or null if it should be
 * dropped. Tracking params are stripped here so that two differently-tagged
 * copies of the same article collapse to one during dedupe.
 */
function normalizeCandidate(raw: string): string | null {
  const trimmed = decodeHrefEntities(raw.trim());
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  // mailto:, tel:, data:, etc.
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') return null;

  if (isDenylisted(parsed)) return null;

  return stripTrackingParams(parsed.toString());
}

export interface ExtractLinksInput {
  html?: string | null;
  text?: string | null;
  maxLinks: number;
}

/**
 * Pulls saved-link candidates out of an email body.
 *
 * Prefers HTML hrefs over the plain-text part: anchor extraction is exact,
 * whereas regexing prose produces URLs glued to punctuation and wrapped across
 * lines. Falls back to plain text when there is no HTML part.
 *
 * Returns de-duplicated, tracking-stripped URLs capped at `maxLinks`, in the
 * order they appeared.
 */
export function extractLinksFromEmail({
  html,
  text,
  maxLinks,
}: ExtractLinksInput): string[] {
  const candidates: string[] = [];

  if (html && html.trim()) {
    for (const match of html.matchAll(HREF_PATTERN)) {
      if (match[1]) candidates.push(match[1]);
    }
  }

  // Fall back to the text part only when HTML yielded nothing, so a message
  // carrying both parts doesn't produce each link twice with different shapes.
  if (candidates.length === 0 && text && text.trim()) {
    for (const match of text.matchAll(PLAIN_TEXT_URL_PATTERN)) {
      candidates.push(trimTrailingPunctuation(match[0]));
    }
  }

  const seen = new Set<string>();
  const results: string[] = [];

  for (const candidate of candidates) {
    const normalized = normalizeCandidate(candidate);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    results.push(normalized);

    if (results.length >= maxLinks) break;
  }

  return results;
}
