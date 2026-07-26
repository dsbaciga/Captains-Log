import axios from '../lib/axios';

export interface SearchResult {
  id: number;
  type: 'trip' | 'location' | 'photo' | 'journal';
  title: string;
  subtitle?: string;
  url: string;
  thumbnail?: string;
  date?: string;
}

export interface GlobalSearchResponse {
  results: SearchResult[];
  total: number;
}

class SearchService {
  /**
   * @param signal Optional AbortSignal so callers can cancel a superseded
   *               search instead of letting a stale response land.
   */
  async globalSearch(
    query: string,
    type: string = 'all',
    signal?: AbortSignal
  ): Promise<GlobalSearchResponse> {
    const response = await axios.get('/search', {
      params: { q: query, type },
      // Only set the key when a signal is supplied, so callers that pass none
      // send exactly the request shape they always did.
      ...(signal ? { signal } : {}),
    });
    return response.data;
  }
}

export default new SearchService();

