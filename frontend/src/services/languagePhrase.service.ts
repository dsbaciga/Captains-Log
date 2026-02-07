import axios from '../lib/axios';
import type {
  AvailableLanguage,
  LanguageWithPhrases,
  TripLanguage,
  AddTripLanguageDTO,
  PhraseCategory,
} from '../types/languagePhrase';

class LanguagePhraseService {
  /**
   * Get all available languages with phrase counts
   */
  async getAvailableLanguages(): Promise<AvailableLanguage[]> {
    const response = await axios.get('/languages');
    return response.data;
  }

  /**
   * Get all phrases for a specific language
   */
  async getPhrasesByLanguage(languageCode: string): Promise<LanguageWithPhrases> {
    const response = await axios.get(`/phrases/${languageCode}`);
    return response.data;
  }

  /**
   * Get phrases for a specific language filtered by category
   */
  async getPhrasesByCategory(
    languageCode: string,
    category: PhraseCategory
  ): Promise<LanguageWithPhrases> {
    const response = await axios.get(`/phrases/${languageCode}/category/${category}`);
    return response.data;
  }

  /**
   * Get all phrase categories
   */
  async getCategories(): Promise<PhraseCategory[]> {
    const response = await axios.get('/phrases/categories');
    return response.data;
  }

  /**
   * Get languages selected for a trip
   */
  async getTripLanguages(tripId: number): Promise<TripLanguage[]> {
    const response = await axios.get(`/trips/${tripId}/languages`);
    // Map API field names to frontend field names
    return response.data.map((lang: { id: number; tripId: number; languageCode: string; language: string }) => ({
      ...lang,
      languageName: lang.language,
    }));
  }

  /**
   * Add a language to a trip
   */
  async addTripLanguage(tripId: number, data: AddTripLanguageDTO): Promise<TripLanguage> {
    // Map frontend field name to API field name
    const apiData = {
      languageCode: data.languageCode,
      language: data.languageName,
    };
    const response = await axios.post(`/trips/${tripId}/languages`, apiData);
    // Map API response back to frontend field names
    const apiResult = response.data;
    return {
      ...apiResult,
      languageName: apiResult.language,
    };
  }

  /**
   * Remove a language from a trip
   */
  async removeTripLanguage(tripId: number, languageCode: string): Promise<void> {
    await axios.delete(`/trips/${tripId}/languages/${languageCode}`);
  }

  /**
   * Get phrases for all languages selected for a trip
   */
  async getTripPhrases(tripId: number): Promise<{ languages: LanguageWithPhrases[] }> {
    const response = await axios.get(`/trips/${tripId}/phrases`);
    return response.data;
  }
}

export default new LanguagePhraseService();
