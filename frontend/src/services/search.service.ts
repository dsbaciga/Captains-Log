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
  status: string;
  data: {
    results: SearchResult[];
    total: number;
  };
}

class SearchService {
  async globalSearch(query: string, type: string = 'all'): Promise<GlobalSearchResponse> {
    const response = await axios.get<GlobalSearchResponse>('/search', {
      params: { q: query, type },
    });
    return response.data;
  }
}

export default new SearchService();

