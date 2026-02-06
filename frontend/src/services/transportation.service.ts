import api from '../lib/axios';
import type {
  Transportation,
  CreateTransportationInput,
  UpdateTransportationInput,
} from '../types/transportation';

class TransportationService {
  async createTransportation(
    data: CreateTransportationInput
  ): Promise<Transportation> {
    const response = await api.post('/transportation', data);
    return response.data.data;
  }

  async getAllTransportation(): Promise<Transportation[]> {
    const response = await api.get('/transportation');
    return response.data.data;
  }

  async getTransportationByTrip(tripId: number): Promise<Transportation[]> {
    const response = await api.get(`/transportation/trip/${tripId}`);
    return response.data.data;
  }

  async getTransportationById(id: number): Promise<Transportation> {
    const response = await api.get(`/transportation/${id}`);
    return response.data.data;
  }

  async updateTransportation(
    id: number,
    data: UpdateTransportationInput
  ): Promise<Transportation> {
    const response = await api.put(`/transportation/${id}`, data);
    return response.data.data;
  }

  async deleteTransportation(id: number): Promise<void> {
    await api.delete(`/transportation/${id}`);
  }

  async recalculateDistancesForTrip(tripId: number): Promise<{ count: number }> {
    const response = await api.post(`/transportation/trip/${tripId}/recalculate-distances`);
    return response.data.data;
  }

  async bulkDeleteTransportation(tripId: number, ids: number[]): Promise<{ success: boolean; deletedCount: number }> {
    const response = await api.delete(`/transportation/trip/${tripId}/bulk`, { data: { ids } });
    return response.data.data;
  }

  async bulkUpdateTransportation(
    tripId: number,
    ids: number[],
    updates: { type?: string; carrier?: string; notes?: string }
  ): Promise<{ success: boolean; updatedCount: number }> {
    const response = await api.patch(`/transportation/trip/${tripId}/bulk`, { ids, updates });
    return response.data.data;
  }
}

export default new TransportationService();
