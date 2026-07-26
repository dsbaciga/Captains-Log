import axios from '../lib/axios';
import type { User, UpdateUserSettingsInput, UserSearchResult, TravelPartnerSettings, UpdateTravelPartnerInput } from '../types/user';
import { isMapsApp, type MapsApp } from '../lib/mapsDeepLinks';

export interface SmtpSettingsResponse {
  smtpProvider: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean | null;
  smtpUser: string | null;
  smtpFrom: string | null;
  smtpPasswordSet: boolean;
  smtpConfigured: boolean;
}

export interface LlmSettingsResponse {
  llmApiKeySet: boolean;
  llmBaseUrl: string | null;
  llmModel: string | null;
  llmConfigured: boolean;
}

export interface UpdateLlmSettingsInput {
  llmApiKey?: string | null;
  llmBaseUrl?: string | null;
  llmModel?: string | null;
}

export interface MapsSettingsResponse {
  /** Null when the user has expressed no preference. */
  preferredMapsApp: MapsApp | null;
}

export interface LinkIngestSettingsResponse {
  /** Always trusted; shown read-only, not part of the editable list. */
  accountEmail: string;
  /** Extra addresses trusted to forward links for this user. */
  linkIngestSenders: string[];
  /** The mailbox links are forwarded TO. Server config, null when unset. */
  ingestMailbox: string | null;
  /** False when the server has no IMAP credentials configured. */
  ingestEnabled: boolean;
}

export interface UpdateSmtpSettingsInput {
  smtpProvider?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpFrom?: string | null;
}

const userService = {
  async getMe(): Promise<User> {
    const response = await axios.get('/users/me');
    return response.data;
  },

  async updateSettings(data: UpdateUserSettingsInput): Promise<User> {
    const response = await axios.put('/users/settings', data);
    return response.data;
  },

  async updateUsername(username: string): Promise<{ success: boolean; message: string; username: string }> {
    const response = await axios.put('/users/username', { username });
    return response.data;
  },

  async updatePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.put('/users/password', { currentPassword, newPassword });
    return response.data;
  },

  async getWeatherSettings(): Promise<{ weatherApiKeySet: boolean }> {
    const response = await axios.get('/users/weather-settings');
    return response.data;
  },

  async updateWeatherSettings(data: { weatherApiKey: string | null }): Promise<{ success: boolean; message: string; weatherApiKeySet: boolean }> {
    const response = await axios.put('/users/weather-settings', data);
    return response.data;
  },

  async getAviationstackSettings(): Promise<{ aviationstackApiKeySet: boolean }> {
    const response = await axios.get('/users/aviationstack-settings');
    return response.data;
  },

  async updateAviationstackSettings(data: { aviationstackApiKey: string | null }): Promise<{ success: boolean; message: string; aviationstackApiKeySet: boolean }> {
    const response = await axios.put('/users/aviationstack-settings', data);
    return response.data;
  },

  async getOpenrouteserviceSettings(): Promise<{ openrouteserviceApiKeySet: boolean }> {
    const response = await axios.get('/users/openrouteservice-settings');
    return response.data;
  },

  async updateOpenrouteserviceSettings(data: { openrouteserviceApiKey: string | null }): Promise<{ success: boolean; message: string; openrouteserviceApiKeySet: boolean }> {
    const response = await axios.put('/users/openrouteservice-settings', data);
    return response.data;
  },

  async getLlmSettings(): Promise<LlmSettingsResponse> {
    const response = await axios.get('/users/llm-settings');
    return response.data;
  },

  async updateLlmSettings(data: UpdateLlmSettingsInput): Promise<LlmSettingsResponse & { message: string }> {
    const response = await axios.put('/users/llm-settings', data);
    return response.data;
  },

  async getMapsSettings(): Promise<MapsSettingsResponse> {
    const response = await axios.get<{ preferredMapsApp: unknown }>('/users/maps-settings');
    // The column is a plain string server-side; narrow it here so callers get
    // a real MapsApp union and an unknown value degrades to "no preference".
    return {
      preferredMapsApp: isMapsApp(response.data.preferredMapsApp)
        ? response.data.preferredMapsApp
        : null,
    };
  },

  async updateMapsSettings(preferredMapsApp: MapsApp | null): Promise<MapsSettingsResponse> {
    const response = await axios.put<{ preferredMapsApp: unknown }>('/users/maps-settings', {
      preferredMapsApp,
    });
    return {
      preferredMapsApp: isMapsApp(response.data.preferredMapsApp)
        ? response.data.preferredMapsApp
        : null,
    };
  },

  async getLinkIngestSettings(): Promise<LinkIngestSettingsResponse> {
    const response = await axios.get('/users/link-ingest');
    return response.data;
  },

  async updateLinkIngestSettings(
    linkIngestSenders: string[]
  ): Promise<LinkIngestSettingsResponse> {
    const response = await axios.put('/users/link-ingest', { linkIngestSenders });
    return response.data;
  },

  async getSmtpSettings(): Promise<SmtpSettingsResponse> {
    const response = await axios.get('/users/smtp-settings');
    return response.data;
  },

  async updateSmtpSettings(data: UpdateSmtpSettingsInput): Promise<{ success: boolean; message: string; smtpConfigured: boolean }> {
    const response = await axios.put('/users/smtp-settings', data);
    return response.data;
  },

  async testSmtpSettings(): Promise<{ success: boolean; message: string }> {
    const response = await axios.post('/users/smtp-settings/test');
    return response.data;
  },

  async renameTripType(oldName: string, newName: string): Promise<{ success: boolean; message: string; tripTypes: Array<{ name: string; emoji: string }> }> {
    const response = await axios.put('/users/settings/trip-types/rename', { oldName, newName });
    return response.data;
  },

  async deleteTripType(typeName: string): Promise<{ success: boolean; message: string; tripTypes: Array<{ name: string; emoji: string }> }> {
    const response = await axios.delete(`/users/settings/trip-types/${encodeURIComponent(typeName)}`);
    return response.data;
  },

  async renameCategory(oldName: string, newName: string): Promise<{ success: boolean; message: string; categories: Array<{ name: string; emoji: string }> }> {
    const response = await axios.put('/users/settings/categories/rename', { oldName, newName });
    return response.data;
  },

  async deleteCategory(categoryName: string): Promise<{ success: boolean; message: string; categories: Array<{ name: string; emoji: string }> }> {
    const response = await axios.delete(`/users/settings/categories/${encodeURIComponent(categoryName)}`);
    return response.data;
  },

  async searchUsers(query: string, signal?: AbortSignal): Promise<UserSearchResult[]> {
    const response = await axios.get('/users/search', { params: { query }, signal });
    return response.data;
  },

  async getTravelPartnerSettings(): Promise<TravelPartnerSettings> {
    const response = await axios.get('/users/travel-partner');
    return response.data;
  },

  async updateTravelPartnerSettings(data: UpdateTravelPartnerInput): Promise<TravelPartnerSettings & { success: boolean; message: string }> {
    const response = await axios.put('/users/travel-partner', data);
    return response.data;
  },
};

export default userService;
