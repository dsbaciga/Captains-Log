import axios from '../lib/axios';
import type {
  BulkDeleteSavedLinksResponse,
  CreateSavedLinkInput,
  InboxCountResponse,
  SavedLink,
  UpdateSavedLinkInput,
} from '../types/savedLink';

export const savedLinkService = {
  async createSavedLink(data: CreateSavedLinkInput): Promise<SavedLink> {
    const response = await axios.post<SavedLink>('/saved-links', data);
    return response.data;
  },

  /**
   * Lists saved links. Pass 'none' to fetch the unassigned inbox, a trip id to
   * fetch one trip's links, or omit for everything.
   */
  async getSavedLinks(tripId?: number | 'none'): Promise<SavedLink[]> {
    const response = await axios.get<SavedLink[]>('/saved-links', {
      params: tripId === undefined ? undefined : { tripId },
    });
    return response.data;
  },

  async getSavedLinksByTrip(tripId: number): Promise<SavedLink[]> {
    const response = await axios.get<SavedLink[]>(
      `/trips/${tripId}/saved-links`
    );
    return response.data;
  },

  async getSavedLinkById(linkId: number): Promise<SavedLink> {
    const response = await axios.get<SavedLink>(`/saved-links/${linkId}`);
    return response.data;
  },

  async updateSavedLink(
    linkId: number,
    data: UpdateSavedLinkInput
  ): Promise<SavedLink> {
    const response = await axios.patch<SavedLink>(
      `/saved-links/${linkId}`,
      data
    );
    return response.data;
  },

  async deleteSavedLink(linkId: number): Promise<void> {
    await axios.delete(`/saved-links/${linkId}`);
  },

  /**
   * Deletes several links at once. Ids may span the inbox and any trip, since
   * the endpoint is owner-scoped rather than trip-scoped.
   */
  async bulkDeleteSavedLinks(
    ids: number[]
  ): Promise<BulkDeleteSavedLinksResponse> {
    const response = await axios.delete<BulkDeleteSavedLinksResponse>(
      '/saved-links/bulk',
      { data: { ids } }
    );
    return response.data;
  },

  /** Deletes every link not assigned to a trip. */
  async deleteUnassignedSavedLinks(): Promise<BulkDeleteSavedLinksResponse> {
    const response = await axios.delete<BulkDeleteSavedLinksResponse>(
      '/saved-links/inbox'
    );
    return response.data;
  },

  async refreshMetadata(linkId: number): Promise<SavedLink> {
    const response = await axios.post<SavedLink>(
      `/saved-links/${linkId}/refresh-metadata`
    );
    return response.data;
  },

  async getInboxCount(): Promise<InboxCountResponse> {
    const response = await axios.get<InboxCountResponse>(
      '/saved-links/inbox-count'
    );
    return response.data;
  },
};

export default savedLinkService;
