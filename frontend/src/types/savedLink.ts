export const SAVED_LINK_SOURCES = ['MANUAL', 'EMAIL'] as const;
export type SavedLinkSource = (typeof SAVED_LINK_SOURCES)[number];

export const LINK_METADATA_STATUSES = [
  'PENDING',
  'FETCHED',
  'FAILED',
  'SKIPPED',
] as const;
export type LinkMetadataStatus = (typeof LINK_METADATA_STATUSES)[number];

export const SAVED_LINK_SOURCE_LABELS: Record<SavedLinkSource, string> = {
  MANUAL: 'Added manually',
  EMAIL: 'From email',
};

export const LINK_METADATA_STATUS_LABELS: Record<LinkMetadataStatus, string> = {
  PENDING: 'Loading preview…',
  FETCHED: 'Preview loaded',
  FAILED: 'No preview available',
  SKIPPED: 'Preview skipped',
};

export interface SavedLink {
  id: number;
  userId: number;
  /** Null while the link sits in the unassigned inbox. */
  tripId: number | null;
  url: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
  imageUrl: string | null;
  notes: string | null;
  source: SavedLinkSource;
  metadataStatus: LinkMetadataStatus;
  metadataFetchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedLinkInput {
  url: string;
  tripId?: number | null;
  title?: string | null;
  notes?: string;
}

export interface UpdateSavedLinkInput {
  url?: string;
  tripId?: number | null;
  title?: string | null;
  notes?: string | null;
}

export interface InboxCountResponse {
  count: number;
}

export interface BulkDeleteSavedLinksResponse {
  success: boolean;
  deletedCount: number;
}

/**
 * How often to re-poll a saved-link list while a preview is still being
 * scraped. Metadata is fetched in the background after a link is saved and
 * nothing pushes the result to the client, so the list has to ask.
 */
export const PREVIEW_POLL_INTERVAL_MS = 3000;

/** Whether any link in the list is still waiting on its preview. */
export function hasPendingMetadata(links: SavedLink[] | undefined): boolean {
  return !!links?.some((link) => link.metadataStatus === 'PENDING');
}

/** Best available display name for a link. */
export function savedLinkDisplayTitle(link: SavedLink): string {
  return link.title?.trim() || link.siteName?.trim() || link.url;
}

/** Hostname for display, falling back to the raw URL if unparseable. */
export function savedLinkHostname(link: SavedLink): string {
  try {
    return new URL(link.url).hostname.replace(/^www\./, '');
  } catch {
    return link.url;
  }
}
