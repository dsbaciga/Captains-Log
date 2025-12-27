import axios from '../lib/axios';
import type { Companion, CreateCompanionInput, UpdateCompanionInput } from '../types/companion';

const companionService = {
  async createCompanion(data: CreateCompanionInput): Promise<Companion> {
    const response = await axios.post('/companions', data);
    return response.data;
  },

  async getCompanionsByUser(): Promise<Companion[]> {
    const response = await axios.get('/companions');
    return response.data;
  },

  async getCompanionById(companionId: number): Promise<Companion> {
    const response = await axios.get(`/companions/${companionId}`);
    return response.data;
  },

  async updateCompanion(companionId: number, data: UpdateCompanionInput): Promise<Companion> {
    const response = await axios.put(`/companions/${companionId}`, data);
    return response.data;
  },

  async deleteCompanion(companionId: number): Promise<void> {
    await axios.delete(`/companions/${companionId}`);
  },

  async linkCompanionToTrip(tripId: number, companionId: number): Promise<void> {
    await axios.post('/companions/link', { tripId, companionId });
  },

  async unlinkCompanionFromTrip(tripId: number, companionId: number): Promise<void> {
    await axios.delete(`/companions/trips/${tripId}/companions/${companionId}`);
  },

  async getCompanionsByTrip(tripId: number): Promise<Companion[]> {
    const response = await axios.get(`/companions/trips/${tripId}`);
    return response.data;
  },

  async uploadAvatar(companionId: number, file: File): Promise<Companion> {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await axios.post(`/companions/${companionId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async setImmichAvatar(companionId: number, immichAssetId: string): Promise<Companion> {
    const response = await axios.post(`/companions/${companionId}/avatar/immich`, {
      immichAssetId,
    });
    return response.data;
  },

  async deleteAvatar(companionId: number): Promise<Companion> {
    const response = await axios.delete(`/companions/${companionId}/avatar`);
    return response.data;
  },
};

export default companionService;
