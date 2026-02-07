import axios from '../lib/axios';
import type { PackingSuggestionsResponse } from '../types/packingSuggestion';

class PackingSuggestionService {
  /**
   * Get packing suggestions for a trip based on weather data
   */
  async getSuggestions(tripId: number): Promise<PackingSuggestionsResponse> {
    const response = await axios.get(`/trips/${tripId}/packing-suggestions`);
    return response.data;
  }
}

export default new PackingSuggestionService();
