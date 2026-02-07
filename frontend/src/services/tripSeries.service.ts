import axios from '../lib/axios';
import type { TripSeries, CreateTripSeriesInput, UpdateTripSeriesInput } from '../types/tripSeries';

class TripSeriesService {
  async getAll(): Promise<TripSeries[]> {
    const response = await axios.get('/trip-series');
    return response.data.data;
  }

  async getById(id: number): Promise<TripSeries> {
    const response = await axios.get(`/trip-series/${id}`);
    return response.data.data;
  }

  async create(data: CreateTripSeriesInput): Promise<TripSeries> {
    const response = await axios.post('/trip-series', data);
    return response.data.data;
  }

  async update(id: number, data: UpdateTripSeriesInput): Promise<TripSeries> {
    const response = await axios.put(`/trip-series/${id}`, data);
    return response.data.data;
  }

  async delete(id: number): Promise<void> {
    await axios.delete(`/trip-series/${id}`);
  }

  async addTrip(seriesId: number, tripId: number): Promise<void> {
    await axios.post(`/trip-series/${seriesId}/trips`, { tripId });
  }

  async removeTrip(seriesId: number, tripId: number): Promise<void> {
    await axios.delete(`/trip-series/${seriesId}/trips/${tripId}`);
  }

  async reorderTrips(seriesId: number, tripIds: number[]): Promise<void> {
    await axios.put(`/trip-series/${seriesId}/reorder`, { tripIds });
  }
}

export default new TripSeriesService();
