import api from '../lib/axios';
import type {
  Lodging,
  CreateLodgingInput,
  UpdateLodgingInput,
} from '../types/lodging';

class LodgingService {
  async createLodging(data: CreateLodgingInput): Promise<Lodging> {
    const response = await api.post('/lodging', data);
    return response.data;
  }

  async getLodgingByTrip(tripId: number): Promise<Lodging[]> {
    const response = await api.get(`/lodging/trip/${tripId}`);
    return response.data;
  }

  async getLodgingById(id: number): Promise<Lodging> {
    const response = await api.get(`/lodging/${id}`);
    return response.data;
  }

  async updateLodging(
    id: number,
    data: UpdateLodgingInput
  ): Promise<Lodging> {
    const response = await api.put(`/lodging/${id}`, data);
    return response.data;
  }

  async deleteLodging(id: number): Promise<void> {
    await api.delete(`/lodging/${id}`);
  }
}

export default new LodgingService();
