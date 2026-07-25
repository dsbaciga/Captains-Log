/**
 * LinkMetadata Service Tests
 *
 * Test cases:
 * - LM-001: stripTrackingParams removes utm_* parameters
 * - LM-002: stripTrackingParams removes known click-id parameters
 * - LM-003: stripTrackingParams preserves meaningful params and the fragment
 * - LM-004: stripTrackingParams drops '?' entirely when all params were trackers
 * - LM-005: stripTrackingParams leaves ambiguous params (ref, cid) alone
 * - LM-006: stripTrackingParams returns unparseable input unchanged
 * - LM-007: fetch rejects URLs that fail SSRF validation
 * - LM-008: fetch RE-VALIDATES each redirect hop (SSRF bypass guard)
 * - LM-009: fetch stops after too many redirects
 * - LM-010: fetch extracts Open Graph metadata
 * - LM-011: fetch falls back to <title> when og:title is absent
 * - LM-012: fetch resolves relative og:image against the final URL
 * - LM-013: fetch returns null for non-HTML content
 * - LM-014: fetch returns null (not throw) on transport failure
 */

import { AppError } from '../../errors/errors';

const mockAxiosGet = jest.fn();
jest.mock('axios', () => ({
  __esModule: true,
  default: { get: (...args: unknown[]) => mockAxiosGet(...args) },
}));

const mockValidateUrlNotInternal = jest.fn();
jest.mock('../../security/urlValidation', () => ({
  validateUrlNotInternal: (url: string) => mockValidateUrlNotInternal(url),
}));

jest.mock('../../config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import linkMetadataService, { stripTrackingParams } from '../linkMetadata.service';

function htmlResponse(html: string) {
  return {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    data: html,
  };
}

function redirectResponse(location: string) {
  return { status: 302, headers: { location }, data: '' };
}

describe('stripTrackingParams', () => {
  it('LM-001: removes utm_* parameters', () => {
    expect(
      stripTrackingParams(
        'https://example.com/page?utm_source=news&utm_medium=email&utm_campaign=x'
      )
    ).toBe('https://example.com/page');
  });

  it('LM-002: removes known click-id parameters', () => {
    expect(stripTrackingParams('https://example.com/a?fbclid=abc')).toBe(
      'https://example.com/a'
    );
    expect(stripTrackingParams('https://example.com/a?gclid=abc')).toBe(
      'https://example.com/a'
    );
    expect(stripTrackingParams('https://example.com/a?mc_eid=abc')).toBe(
      'https://example.com/a'
    );
  });

  it('LM-003: preserves meaningful params and the fragment', () => {
    expect(
      stripTrackingParams(
        'https://example.com/search?q=ramen&utm_source=twitter#results'
      )
    ).toBe('https://example.com/search?q=ramen#results');
  });

  it('LM-004: drops the "?" entirely when all params were trackers', () => {
    const result = stripTrackingParams('https://example.com/page?utm_source=x');
    expect(result).toBe('https://example.com/page');
    expect(result).not.toContain('?');
  });

  it('LM-005: leaves ambiguous params alone', () => {
    // `ref` and `cid` are used meaningfully by many sites — stripping them
    // would break links, which is worse than leaving a tracker on.
    expect(stripTrackingParams('https://example.com/a?ref=hn&cid=7')).toBe(
      'https://example.com/a?ref=hn&cid=7'
    );
  });

  it('LM-006: returns unparseable input unchanged', () => {
    expect(stripTrackingParams('not a url')).toBe('not a url');
  });

  it('strips case-insensitively', () => {
    expect(stripTrackingParams('https://example.com/a?UTM_Source=x&FBCLID=y')).toBe(
      'https://example.com/a'
    );
  });
});

describe('LinkMetadataService.fetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateUrlNotInternal.mockResolvedValue(undefined);
  });

  it('LM-007: rejects URLs that fail SSRF validation', async () => {
    mockValidateUrlNotInternal.mockRejectedValue(
      new AppError('URLs pointing to localhost or internal services are not allowed', 400)
    );

    await expect(
      linkMetadataService.fetch('http://localhost:5000/api/trips')
    ).rejects.toThrow(AppError);
    expect(mockAxiosGet).not.toHaveBeenCalled();
  });

  it('LM-008: re-validates every redirect hop', async () => {
    // The critical SSRF guard: a public URL that 302s to link-local metadata.
    mockAxiosGet
      .mockResolvedValueOnce(redirectResponse('http://169.254.169.254/latest/meta-data/'))
      .mockResolvedValueOnce(htmlResponse('<title>should never be reached</title>'));

    mockValidateUrlNotInternal.mockImplementation((url: string) => {
      if (url.includes('169.254.169.254')) {
        return Promise.reject(
          new AppError('URLs pointing to private or internal IP addresses are not allowed', 400)
        );
      }
      return Promise.resolve(undefined);
    });

    await expect(
      linkMetadataService.fetch('https://evil.example.com/redirect')
    ).rejects.toThrow(AppError);

    expect(mockValidateUrlNotInternal).toHaveBeenCalledWith(
      'http://169.254.169.254/latest/meta-data/'
    );
    // The redirect target must never have been requested.
    expect(mockAxiosGet).toHaveBeenCalledTimes(1);
  });

  it('LM-008b: passes maxRedirects: 0 so axios cannot follow unvalidated', async () => {
    mockAxiosGet.mockResolvedValue(htmlResponse('<title>Hi</title>'));

    await linkMetadataService.fetch('https://example.com/');

    expect(mockAxiosGet).toHaveBeenCalledWith(
      'https://example.com/',
      expect.objectContaining({ maxRedirects: 0 })
    );
  });

  it('LM-009: gives up after too many redirects', async () => {
    mockAxiosGet.mockResolvedValue(redirectResponse('https://example.com/next'));

    const result = await linkMetadataService.fetch('https://example.com/start');

    expect(result).toBeNull();
  });

  it('LM-010: extracts Open Graph metadata', async () => {
    mockAxiosGet.mockResolvedValue(
      htmlResponse(`
        <html><head>
          <meta property="og:title" content="Best Ramen in Tokyo" />
          <meta property="og:description" content="A guide to the top shops" />
          <meta property="og:site_name" content="Tokyo Eats" />
          <meta property="og:image" content="https://cdn.example.com/ramen.jpg" />
        </head></html>
      `)
    );

    const result = await linkMetadataService.fetch('https://example.com/ramen');

    expect(result).toEqual({
      title: 'Best Ramen in Tokyo',
      description: 'A guide to the top shops',
      siteName: 'Tokyo Eats',
      imageUrl: 'https://cdn.example.com/ramen.jpg',
      // No redirect occurred, so this is the submitted URL.
      resolvedUrl: 'https://example.com/ramen',
    });
  });

  it('LM-015: reports the post-redirect URL, tracking-stripped', async () => {
    // Callers store this in place of the submitted URL, so a click-wrapper
    // resolves to the real page rather than the tracking hop.
    mockAxiosGet
      .mockResolvedValueOnce(
        redirectResponse('https://example.com/article?utm_source=newsletter')
      )
      .mockResolvedValueOnce(htmlResponse('<title>Article</title>'));

    const result = await linkMetadataService.fetch(
      'https://click.email.example.com/abc123'
    );

    expect(result?.resolvedUrl).toBe('https://example.com/article');
  });

  it('handles content-before-property attribute order', async () => {
    mockAxiosGet.mockResolvedValue(
      htmlResponse('<meta content="Reversed Order" property="og:title">')
    );

    const result = await linkMetadataService.fetch('https://example.com/');

    expect(result?.title).toBe('Reversed Order');
  });

  it('decodes HTML entities in metadata', async () => {
    mockAxiosGet.mockResolvedValue(
      htmlResponse('<meta property="og:title" content="Ben &amp; Jerry&#39;s">')
    );

    const result = await linkMetadataService.fetch('https://example.com/');

    expect(result?.title).toBe("Ben & Jerry's");
  });

  it('LM-011: falls back to <title> when og:title is absent', async () => {
    mockAxiosGet.mockResolvedValue(
      htmlResponse('<html><head><title>  Plain Page  </title></head></html>')
    );

    const result = await linkMetadataService.fetch('https://example.com/plain');

    expect(result?.title).toBe('Plain Page');
    // siteName falls back to the hostname
    expect(result?.siteName).toBe('example.com');
  });

  it('LM-012: resolves a relative og:image against the final URL', async () => {
    mockAxiosGet
      .mockResolvedValueOnce(redirectResponse('https://moved.example.com/final'))
      .mockResolvedValueOnce(
        htmlResponse('<meta property="og:image" content="/img/hero.png">')
      );

    const result = await linkMetadataService.fetch('https://example.com/start');

    expect(result?.imageUrl).toBe('https://moved.example.com/img/hero.png');
  });

  it('LM-013: returns null for non-HTML content', async () => {
    mockAxiosGet.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/pdf' },
      data: '%PDF-1.4',
    });

    const result = await linkMetadataService.fetch('https://example.com/doc.pdf');

    expect(result).toBeNull();
  });

  it('LM-014: returns null rather than throwing on transport failure', async () => {
    mockAxiosGet.mockRejectedValue(new Error('ETIMEDOUT'));

    const result = await linkMetadataService.fetch('https://example.com/slow');

    expect(result).toBeNull();
  });
});
