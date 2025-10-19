import axios from '../lib/axios';
import type { Trip, CreateTripInput, UpdateTripInput, TripListResponse } from '../types/trip';

class TripService {
  async createTrip(data: CreateTripInput): Promise<Trip> {
    const response = await axios.post('/trips', data);
    return response.data.data;
  }

  async getTrips(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<TripListResponse> {
    const response = await axios.get('/trips', { params });
    return response.data.data;
  }

  async getTripById(id: number): Promise<Trip> {
    const response = await axios.get(`/trips/${id}`);
    return response.data.data;
  }

  async updateTrip(id: number, data: UpdateTripInput): Promise<Trip> {
    const response = await axios.put(`/trips/${id}`, data);
    return response.data.data;
  }

  async deleteTrip(id: number): Promise<void> {
    await axios.delete(`/trips/${id}`);
  }

  async updateCoverPhoto(tripId: number, photoId: number | null): Promise<Trip> {
    const response = await axios.put(`/trips/${tripId}/cover-photo`, { photoId });
    return response.data.data;
  }
}

export default new TripService();
