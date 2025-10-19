import axios from '../lib/axios';
import type { Location, LocationCategory, CreateLocationInput, UpdateLocationInput } from '../types/location';

class LocationService {
  async createLocation(data: CreateLocationInput): Promise<Location> {
    const response = await axios.post('/locations', data);
    return response.data.data;
  }

  async getLocationsByTrip(tripId: number): Promise<Location[]> {
    const response = await axios.get(`/locations/trip/${tripId}`);
    return response.data.data;
  }

  async getAllVisitedLocations(): Promise<Location[]> {
    const response = await axios.get('/locations/visited');
    return response.data.data;
  }

  async getLocationById(id: number): Promise<Location> {
    const response = await axios.get(`/locations/${id}`);
    return response.data.data;
  }

  async updateLocation(id: number, data: UpdateLocationInput): Promise<Location> {
    const response = await axios.put(`/locations/${id}`, data);
    return response.data.data;
  }

  async deleteLocation(id: number): Promise<void> {
    await axios.delete(`/locations/${id}`);
  }

  // Categories
  async getCategories(): Promise<LocationCategory[]> {
    const response = await axios.get('/locations/categories/list');
    return response.data.data;
  }

  async createCategory(data: { name: string; icon?: string; color?: string }): Promise<LocationCategory> {
    const response = await axios.post('/locations/categories', data);
    return response.data.data;
  }
}

export default new LocationService();
