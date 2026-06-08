import axios from '../lib/axios';

/** A single airport returned by the backend airport search. */
export interface AirportSearchResult {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

class AirportService {
  private baseUrl = '/airports';

  /**
   * Search airports by IATA/ICAO code or by airport/city name.
   * Returns an empty list for queries shorter than 2 characters.
   */
  async searchAirports(query: string): Promise<AirportSearchResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return [];
    }
    // The axios response interceptor unwraps `{ status, data }`, so
    // `response.data` is the airport array itself.
    const response = await axios.get<AirportSearchResult[]>(this.baseUrl, {
      params: { q: trimmed },
    });
    return response.data;
  }
}

export default new AirportService();
