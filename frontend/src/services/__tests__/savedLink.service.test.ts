import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted so the mock functions can be referenced directly in assertions.
// This keeps them typed as mocks throughout, avoiding a cast on every use.
const mockAxios = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../lib/axios', () => ({ default: mockAxios }));

import savedLinkService from '../savedLink.service';
import {
  hasPendingMetadata,
  savedLinkDisplayTitle,
  savedLinkHostname,
  type SavedLink,
} from '../../types/savedLink';

const mockLink: SavedLink = {
  id: 1,
  userId: 7,
  tripId: null,
  url: 'https://example.com/ramen',
  title: 'Best Ramen',
  description: null,
  siteName: 'Tokyo Eats',
  imageUrl: null,
  notes: null,
  source: 'MANUAL',
  metadataStatus: 'FETCHED',
  metadataFetchedAt: null,
  createdAt: '2026-07-25T00:00:00.000Z',
  updatedAt: '2026-07-25T00:00:00.000Z',
};

describe('savedLinkService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a link via POST /saved-links', async () => {
    mockAxios.post.mockResolvedValue({ data: mockLink });

    const result = await savedLinkService.createSavedLink({
      url: 'https://example.com/ramen',
      tripId: 42,
    });

    expect(mockAxios.post).toHaveBeenCalledWith('/saved-links', {
      url: 'https://example.com/ramen',
      tripId: 42,
    });
    expect(result).toEqual(mockLink);
  });

  it("requests the inbox with tripId 'none'", async () => {
    mockAxios.get.mockResolvedValue({ data: [mockLink] });

    await savedLinkService.getSavedLinks('none');

    expect(mockAxios.get).toHaveBeenCalledWith('/saved-links', {
      params: { tripId: 'none' },
    });
  });

  it('omits params entirely when no filter is given', async () => {
    mockAxios.get.mockResolvedValue({ data: [] });

    await savedLinkService.getSavedLinks();

    expect(mockAxios.get).toHaveBeenCalledWith('/saved-links', { params: undefined });
  });

  it('fetches a trip\'s links from the nested route', async () => {
    mockAxios.get.mockResolvedValue({ data: [mockLink] });

    const result = await savedLinkService.getSavedLinksByTrip(42);

    expect(mockAxios.get).toHaveBeenCalledWith('/trips/42/saved-links');
    expect(result).toEqual([mockLink]);
  });

  it('updates via PATCH, including unassigning to the inbox', async () => {
    mockAxios.patch.mockResolvedValue({ data: mockLink });

    await savedLinkService.updateSavedLink(1, { tripId: null });

    expect(mockAxios.patch).toHaveBeenCalledWith('/saved-links/1', { tripId: null });
  });

  it('deletes via DELETE /saved-links/:id', async () => {
    mockAxios.delete.mockResolvedValue({ data: null });

    await savedLinkService.deleteSavedLink(1);

    expect(mockAxios.delete).toHaveBeenCalledWith('/saved-links/1');
  });

  it('bulk deletes by sending ids in the DELETE body', async () => {
    mockAxios.delete.mockResolvedValue({ data: { success: true, deletedCount: 2 } });

    const result = await savedLinkService.bulkDeleteSavedLinks([1, 2]);

    expect(mockAxios.delete).toHaveBeenCalledWith('/saved-links/bulk', {
      data: { ids: [1, 2] },
    });
    expect(result).toEqual({ success: true, deletedCount: 2 });
  });

  it('empties the inbox via DELETE /saved-links/inbox', async () => {
    mockAxios.delete.mockResolvedValue({ data: { success: true, deletedCount: 5 } });

    const result = await savedLinkService.deleteUnassignedSavedLinks();

    expect(mockAxios.delete).toHaveBeenCalledWith('/saved-links/inbox');
    expect(result).toEqual({ success: true, deletedCount: 5 });
  });

  it('refreshes metadata via POST', async () => {
    mockAxios.post.mockResolvedValue({ data: mockLink });

    await savedLinkService.refreshMetadata(1);

    expect(mockAxios.post).toHaveBeenCalledWith('/saved-links/1/refresh-metadata');
  });

  it('fetches the inbox count', async () => {
    mockAxios.get.mockResolvedValue({ data: { count: 4 } });

    const result = await savedLinkService.getInboxCount();

    expect(mockAxios.get).toHaveBeenCalledWith('/saved-links/inbox-count');
    expect(result).toEqual({ count: 4 });
  });
});

describe('savedLink display helpers', () => {
  it('prefers the title, then site name, then the raw URL', () => {
    expect(savedLinkDisplayTitle(mockLink)).toBe('Best Ramen');
    expect(savedLinkDisplayTitle({ ...mockLink, title: null })).toBe('Tokyo Eats');
    expect(
      savedLinkDisplayTitle({ ...mockLink, title: null, siteName: null })
    ).toBe('https://example.com/ramen');
    // Whitespace-only titles must not win over the fallbacks.
    expect(savedLinkDisplayTitle({ ...mockLink, title: '   ' })).toBe('Tokyo Eats');
  });

  it('strips the www prefix from the hostname', () => {
    expect(
      savedLinkHostname({ ...mockLink, url: 'https://www.example.com/a/b' })
    ).toBe('example.com');
  });

  it('falls back to the raw value for an unparseable URL', () => {
    expect(savedLinkHostname({ ...mockLink, url: 'not a url' })).toBe('not a url');
  });
});

describe('hasPendingMetadata', () => {
  it('is true while any link is still awaiting its preview', () => {
    expect(
      hasPendingMetadata([mockLink, { ...mockLink, id: 2, metadataStatus: 'PENDING' }])
    ).toBe(true);
  });

  it('is false once every link has settled, and for no data', () => {
    // FAILED and SKIPPED are terminal: polling must stop, not spin forever.
    expect(
      hasPendingMetadata([
        { ...mockLink, metadataStatus: 'FETCHED' },
        { ...mockLink, id: 2, metadataStatus: 'FAILED' },
        { ...mockLink, id: 3, metadataStatus: 'SKIPPED' },
      ])
    ).toBe(false);
    expect(hasPendingMetadata([])).toBe(false);
    expect(hasPendingMetadata(undefined)).toBe(false);
  });
});
