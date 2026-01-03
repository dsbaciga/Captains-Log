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
    return response.data;
  }

  async getTransportationByTrip(tripId: number): Promise<Transportation[]> {
    const response = await api.get(`/transportation/trip/${tripId}`);
    return response.data;
  }

  async getTransportationById(id: number): Promise<Transportation> {
    const response = await api.get(`/transportation/${id}`);
    return response.data;
  }

  async updateTransportation(
    id: number,
    data: UpdateTransportationInput
  ): Promise<Transportation> {
    const response = await api.put(`/transportation/${id}`, data);
    return response.data;
  }

  async deleteTransportation(id: number): Promise<void> {
    await api.delete(`/transportation/${id}`);
  }

  async recalculateDistancesForTrip(tripId: number): Promise<{ count: number }> {
    const response = await api.post(`/transportation/trip/${tripId}/recalculate-distances`);
    return response.data;
  }
}

export default new TransportationService();
