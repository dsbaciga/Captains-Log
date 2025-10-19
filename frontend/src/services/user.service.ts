import axios from '../lib/axios';
import type { User, UpdateUserSettingsInput } from '../types/user';

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
};

export default userService;
