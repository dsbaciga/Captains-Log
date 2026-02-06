import api from '../lib/axios';
import type {
  Lodging,
  CreateLodgingInput,
  UpdateLodgingInput,
} from '../types/lodging';

class LodgingService {
  async createLodging(data: CreateLodgingInput): Promise<Lodging> {
    const response = await api.post('/lodging', data);
    return response.data.data;
  }

  async getLodgingByTrip(tripId: number): Promise<Lodging[]> {
    const response = await api.get(`/lodging/trip/${tripId}`);
    return response.data.data;
  }

  async getLodgingById(id: number): Promise<Lodging> {
    const response = await api.get(`/lodging/${id}`);
    return response.data.data;
  }

  async updateLodging(
    id: number,
    data: UpdateLodgingInput
  ): Promise<Lodging> {
    const response = await api.put(`/lodging/${id}`, data);
    return response.data.data;
  }

  async deleteLodging(id: number): Promise<void> {
    await api.delete(`/lodging/${id}`);
  }

  async bulkDeleteLodging(tripId: number, ids: number[]): Promise<{ success: boolean; deletedCount: number }> {
    const response = await api.delete(`/lodging/trip/${tripId}/bulk`, { data: { ids } });
    return response.data.data;
  }

  async bulkUpdateLodging(
    tripId: number,
    ids: number[],
    updates: { type?: string; notes?: string }
  ): Promise<{ success: boolean; updatedCount: number }> {
    const response = await api.patch(`/lodging/trip/${tripId}/bulk`, { ids, updates });
    return response.data.data;
  }
}

export default new LodgingService();
