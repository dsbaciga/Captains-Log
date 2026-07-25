import axios from 'axios';
import { URL } from 'url';
import logger from '../config/logger';
import { AppError } from '../errors/errors';
import { validateUrlNotInternal } from '../security/urlValidation';
import { LinkMetadata } from '../types/savedLink.types';

/**
 * Fetches Open Graph / HTML head metadata for a user-supplied URL.
 *
 * SECURITY: this makes server-side requests to arbitrary user-controlled URLs,
 * which is a textbook SSRF sink. Three defences, all load-bearing:
 *
 *  1. `validateUrlNotInternal` runs before EVERY request (scheme, blocked
 *     hostnames, .local/.internal, private IP literals, DNS rebinding).
 *  2. Redirects are followed MANUALLY with `maxRedirects: 0`, re-validating
 *     each hop. Axios' built-in redirect following does not re-validate, so a
 *     302 to 169.254.169.254 would otherwise bypass check 1 entirely.
 *  3. The response body is capped — only <head> is ever needed.
 *
 * A residual TOCTOU gap remains between DNS validation and connection (the
 * hostname could re-resolve). Accepted for a self-hosted personal app; closing
 * it would require pinning the validated IP into the socket connect.
 */

/** Only the document head is needed; stop reading well before a full page. */
const MAX_BYTES = 512 * 1024;

/** Per-request timeout. */
const REQUEST_TIMEOUT_MS = 10_000;

/** Redirect hops to follow. Each one is re-validated. */
const MAX_REDIRECTS = 3;

const USER_AGENT =
  'TravelLife/1.0 (+link-preview; self-hosted travel journal)';

interface FetchedPage {
  html: string;
  finalUrl: string;
}

/**
 * Query parameters that exist only to track the person following the link.
 *
 * Deliberately conservative: every entry here is a known analytics/ad-click
 * parameter that carries no page state. Ambiguous names that some sites use
 * meaningfully — bare `ref`, `cid`, `source` — are NOT stripped, because
 * breaking a link is worse than leaving a tracker on it.
 */
const TRACKING_PARAMS = new Set([
  // Google / Google Ads
  'gclid',
  'gclsrc',
  'dclid',
  'gbraid',
  'wbraid',
  'srsltid',
  'gad_source',
  // Meta
  'fbclid',
  'igshid',
  'igsh',
  // Microsoft / Bing
  'msclkid',
  // X/Twitter
  'twclid',
  'ref_src',
  'ref_url',
  // TikTok / Yandex / Mail.ru
  'ttclid',
  'yclid',
  '_openstat',
  // Mailchimp
  'mc_cid',
  'mc_eid',
  // HubSpot
  '_hsenc',
  '_hsmi',
  'hsctatracking',
  // Marketo
  'mkt_tok',
  // Olytics
  'oly_anon_id',
  'oly_enc_id',
  // Vero
  'vero_conv',
  'vero_id',
  // Adobe / misc campaign trackers
  's_kwcid',
  'ef_id',
  'icid',
  // Alibaba
  'spm',
  // LinkedIn
  'trk',
  'trkcampaign',
  // Share-token trackers (YouTube/Spotify "copy link" params)
  'si',
  // Instagram/Threads share ids
  'sh',
]);

/**
 * Strips tracking parameters from a URL.
 *
 * Removes any param in TRACKING_PARAMS plus anything matching the `utm_*` /
 * `pk_*` (Matomo) / `mtm_*` (Matomo 4) prefixes. Preserves the fragment, since
 * anchors are real page state. Returns the input unchanged if it can't be
 * parsed — validation elsewhere will reject it.
 */
export function stripTrackingParams(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  const keysToDelete: string[] = [];
  for (const key of parsed.searchParams.keys()) {
    const lower = key.toLowerCase();
    if (
      TRACKING_PARAMS.has(lower) ||
      lower.startsWith('utm_') ||
      lower.startsWith('pk_') ||
      lower.startsWith('mtm_')
    ) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    parsed.searchParams.delete(key);
  }

  // Drop the '?' entirely when every param was a tracker.
  if ([...parsed.searchParams.keys()].length === 0) {
    parsed.search = '';
  }

  return parsed.toString();
}

/**
 * Decodes the handful of HTML entities that realistically appear in title and
 * description meta tags. Not a general-purpose entity decoder.
 */
function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&'); // must be last
}

function clean(value: string | null, maxLength: number): string | null {
  if (!value) return null;
  const trimmed = decodeEntities(value).replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

/**
 * Extracts the content of a <meta> tag by property/name, tolerating attribute
 * order (content-before-property is common) and single or double quotes.
 */
function extractMeta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // property/name first, then content
    const forward = new RegExp(
      `<meta[^>]+(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*?content\\s*=\\s*["']([^"']*)["']`,
      'i'
    );
    // content first, then property/name
    const reverse = new RegExp(
      `<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]*?(?:property|name)\\s*=\\s*["']${escaped}["']`,
      'i'
    );

    const match = html.match(forward) ?? html.match(reverse);
    if (match?.[1]) return match[1];
  }
  return null;
}

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ?? null;
}

/**
 * Performs a GET, following redirects manually so every hop is re-validated
 * against the SSRF rules. Returns the body (truncated) and the final URL.
 */
async function fetchHtml(startUrl: string): Promise<FetchedPage | null> {
  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    // Re-validate on every hop. This is the whole point of manual redirects.
    await validateUrlNotInternal(currentUrl);

    const response = await axios.get(currentUrl, {
      timeout: REQUEST_TIMEOUT_MS,
      maxRedirects: 0,
      responseType: 'text',
      maxContentLength: MAX_BYTES,
      decompress: true,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
      // Handle 3xx ourselves; treat 4xx/5xx as a failed fetch rather than a throw.
      validateStatus: (status) => status >= 200 && status < 400,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers?.location;
      if (!location || typeof location !== 'string') {
        logger.warn('[LinkMetadata] Redirect with no Location header', {
          url: currentUrl,
        });
        return null;
      }
      // Relative redirects are legal; resolve against the current URL.
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    const contentType = String(response.headers?.['content-type'] ?? '');
    if (!contentType.toLowerCase().includes('text/html')) {
      logger.info('[LinkMetadata] Skipping non-HTML content', {
        url: currentUrl,
        contentType,
      });
      return null;
    }

    const html =
      typeof response.data === 'string'
        ? response.data.slice(0, MAX_BYTES)
        : '';

    return { html, finalUrl: currentUrl };
  }

  logger.warn('[LinkMetadata] Too many redirects', { url: startUrl });
  return null;
}

class LinkMetadataService {
  /**
   * Validates a URL for outbound fetching. Throws AppError(400) when the URL
   * targets an internal or otherwise disallowed host.
   */
  async assertFetchable(url: string): Promise<void> {
    await validateUrlNotInternal(url);
  }

  /**
   * Scrapes metadata for a URL.
   *
   * Returns null when the page could not be fetched or parsed — callers treat
   * that as FAILED and keep the link row. A dead URL is still a useful record.
   * Throws only for URLs that fail SSRF validation, so a caller can reject the
   * link outright at create time.
   */
  async fetch(url: string): Promise<LinkMetadata | null> {
    let page: FetchedPage | null;

    try {
      page = await fetchHtml(url);
    } catch (err) {
      // SSRF rejections are deliberate — surface them to the caller.
      if (err instanceof AppError) throw err;
      logger.warn('[LinkMetadata] Fetch failed', {
        url,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }

    if (!page) return null;

    const { html, finalUrl } = page;

    const rawImage = extractMeta(html, ['og:image', 'twitter:image']);
    let imageUrl: string | null = null;
    if (rawImage) {
      try {
        // og:image is frequently a relative path.
        imageUrl = new URL(decodeEntities(rawImage.trim()), finalUrl).toString();
      } catch {
        imageUrl = null;
      }
    }

    const metadata: LinkMetadata = {
      title:
        clean(extractMeta(html, ['og:title', 'twitter:title']), 1000) ??
        clean(extractTitleTag(html), 1000),
      description: clean(
        extractMeta(html, [
          'og:description',
          'twitter:description',
          'description',
        ]),
        2000
      ),
      siteName:
        clean(extractMeta(html, ['og:site_name', 'application-name']), 255) ??
        new URL(finalUrl).hostname,
      imageUrl: imageUrl && imageUrl.length <= 2048 ? imageUrl : null,
      // The URL after following redirects, with tracking params stripped again
      // (a redirect target frequently arrives carrying its own). Callers store
      // this in place of the submitted URL so click-wrappers and shorteners
      // resolve to the real page.
      resolvedUrl: stripTrackingParams(finalUrl),
    };

    return metadata;
  }
}

export default new LinkMetadataService();
