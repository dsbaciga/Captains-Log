/**
 * EmailLinkExtractor Service Tests
 *
 * Marketing email is hostile input, so this pure module carries the heaviest
 * coverage in the ingest path.
 *
 * Test cases:
 * - ELX-001: Extracts hrefs from an HTML body
 * - ELX-002: Falls back to plain text when there is no HTML part
 * - ELX-003: Prefers HTML over text so a multipart message isn't double-counted
 * - ELX-004: Drops non-http(s) schemes (mailto:, tel:)
 * - ELX-005: Drops denylisted ESP/tracking hosts
 * - ELX-006: Drops unsubscribe / tracking-path URLs
 * - ELX-007: Drops image and asset URLs
 * - ELX-008: Strips tracking params, and dedupes what collapses as a result
 * - ELX-009: Caps at maxLinks
 * - ELX-010: Decodes HTML entities in hrefs
 * - ELX-011: Trims trailing punctuation from plain-text URLs
 * - ELX-012: Returns empty for empty/absent bodies
 */

import { extractLinksFromEmail } from '../emailLinkExtractor.service';

describe('extractLinksFromEmail', () => {
  const MAX = 20;

  it('ELX-001: extracts hrefs from an HTML body', () => {
    const html = `
      <p>Great spots:</p>
      <a href="https://example.com/ramen">Ramen</a>
      <a href='https://example.com/sushi'>Sushi</a>
    `;

    expect(extractLinksFromEmail({ html, maxLinks: MAX })).toEqual([
      'https://example.com/ramen',
      'https://example.com/sushi',
    ]);
  });

  it('ELX-002: falls back to plain text when there is no HTML part', () => {
    const text = 'Check https://example.com/trail and https://example.com/map';

    expect(extractLinksFromEmail({ text, maxLinks: MAX })).toEqual([
      'https://example.com/trail',
      'https://example.com/map',
    ]);
  });

  it('ELX-003: prefers HTML so a multipart message is not double-counted', () => {
    const result = extractLinksFromEmail({
      html: '<a href="https://example.com/a">A</a>',
      text: 'https://example.com/b',
      maxLinks: MAX,
    });

    expect(result).toEqual(['https://example.com/a']);
  });

  it('ELX-004: drops non-http(s) schemes', () => {
    const html = `
      <a href="mailto:someone@example.com">Mail</a>
      <a href="tel:+15551234">Call</a>
      <a href="https://example.com/real">Real</a>
    `;

    expect(extractLinksFromEmail({ html, maxLinks: MAX })).toEqual([
      'https://example.com/real',
    ]);
  });

  it('ELX-005: drops denylisted ESP and tracking hosts', () => {
    const html = `
      <a href="https://foo.list-manage.com/subscribe">List</a>
      <a href="https://links.sendgrid.net/x/y">SG</a>
      <a href="https://ad.doubleclick.net/xyz">Ad</a>
      <a href="https://example.com/keep">Keep</a>
    `;

    expect(extractLinksFromEmail({ html, maxLinks: MAX })).toEqual([
      'https://example.com/keep',
    ]);
  });

  it('ELX-006: drops unsubscribe and tracking-path URLs', () => {
    const html = `
      <a href="https://news.example.com/unsubscribe?id=9">Unsubscribe</a>
      <a href="https://news.example.com/preferences">Preferences</a>
      <a href="https://news.example.com/track/abc">Track</a>
      <a href="https://news.example.com/click/abc">Click</a>
      <a href="https://news.example.com/article/tokyo">Article</a>
    `;

    expect(extractLinksFromEmail({ html, maxLinks: MAX })).toEqual([
      'https://news.example.com/article/tokyo',
    ]);
  });

  it('ELX-007: drops image and asset URLs', () => {
    const html = `
      <a href="https://example.com/hero.png">Img</a>
      <a href="https://example.com/app.js">Script</a>
      <a href="https://example.com/story">Story</a>
    `;

    expect(extractLinksFromEmail({ html, maxLinks: MAX })).toEqual([
      'https://example.com/story',
    ]);
  });

  it('ELX-008: strips tracking params and dedupes what collapses as a result', () => {
    // The same article, tagged two different ways, must collapse to one entry.
    const html = `
      <a href="https://example.com/post?utm_source=news">One</a>
      <a href="https://example.com/post?utm_source=twitter&fbclid=abc">Two</a>
    `;

    expect(extractLinksFromEmail({ html, maxLinks: MAX })).toEqual([
      'https://example.com/post',
    ]);
  });

  it('preserves meaningful query params while stripping trackers', () => {
    const html = '<a href="https://example.com/s?q=ramen&utm_medium=email">S</a>';

    expect(extractLinksFromEmail({ html, maxLinks: MAX })).toEqual([
      'https://example.com/s?q=ramen',
    ]);
  });

  it('ELX-009: caps at maxLinks', () => {
    const html = Array.from(
      { length: 30 },
      (_, i) => `<a href="https://example.com/p${i}">P${i}</a>`
    ).join('\n');

    const result = extractLinksFromEmail({ html, maxLinks: 5 });

    expect(result).toHaveLength(5);
    expect(result[0]).toBe('https://example.com/p0');
    expect(result[4]).toBe('https://example.com/p4');
  });

  it('ELX-010: decodes HTML entities in hrefs', () => {
    const html = '<a href="https://example.com/s?a=1&amp;b=2">S</a>';

    expect(extractLinksFromEmail({ html, maxLinks: MAX })).toEqual([
      'https://example.com/s?a=1&b=2',
    ]);
  });

  it('ELX-011: trims trailing punctuation from plain-text URLs', () => {
    const text = 'Try https://example.com/place. Also https://example.com/other,';

    expect(extractLinksFromEmail({ text, maxLinks: MAX })).toEqual([
      'https://example.com/place',
      'https://example.com/other',
    ]);
  });

  it('handles attribute order and extra attributes on the anchor', () => {
    const html =
      '<a class="btn" target="_blank" href="https://example.com/x" rel="noopener">X</a>';

    expect(extractLinksFromEmail({ html, maxLinks: MAX })).toEqual([
      'https://example.com/x',
    ]);
  });

  it('ELX-012: returns empty for empty or absent bodies', () => {
    expect(extractLinksFromEmail({ maxLinks: MAX })).toEqual([]);
    expect(extractLinksFromEmail({ html: '', text: '', maxLinks: MAX })).toEqual([]);
    expect(extractLinksFromEmail({ html: null, text: null, maxLinks: MAX })).toEqual(
      []
    );
  });

  it('ignores malformed hrefs without throwing', () => {
    const html = `
      <a href="not a url">Bad</a>
      <a href="">Empty</a>
      <a href="https://example.com/good">Good</a>
    `;

    expect(extractLinksFromEmail({ html, maxLinks: MAX })).toEqual([
      'https://example.com/good',
    ]);
  });
});
