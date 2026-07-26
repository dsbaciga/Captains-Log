import axios from '../lib/axios';
import type { Trip, CreateTripInput, UpdateTripInput, TripListResponse, ValidationResult, ValidationQuickStatus, ValidationIssueCategory, DuplicateTripInput } from '../types/trip';

class TripService {
  async createTrip(data: CreateTripInput): Promise<Trip> {
    const response = await axios.post('/trips', data);
    return response.data;
  }

  async getTrips(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    tripType?: string;
    archived?: 'true' | 'false' | 'all';
    /** Inclusive lower bound on startDate, as YYYY-MM-DD. */
    startDateFrom?: string;
    /** Inclusive upper bound on startDate, as YYYY-MM-DD. */
    startDateTo?: string;
    /** Comma-separated tag IDs. */
    tags?: string;
    /** Mirrors the backend's sort enum in trip.types.ts. */
    sort?: 'startDate-desc' | 'startDate-asc' | 'title-asc' | 'title-desc' | 'status';
  }): Promise<TripListResponse> {
    const response = await axios.get('/trips', { params });
    return response.data;
  }

  async getTripById(id: number): Promise<Trip> {
    const response = await axios.get(`/trips/${id}`);
    return response.data;
  }

  async updateTrip(id: number, data: UpdateTripInput): Promise<Trip> {
    const response = await axios.put(`/trips/${id}`, data);
    return response.data;
  }

  async deleteTrip(id: number): Promise<void> {
    await axios.delete(`/trips/${id}`);
  }

  async updateCoverPhoto(tripId: number, photoId: number | null): Promise<Trip> {
    const response = await axios.put(`/trips/${tripId}/cover-photo`, { photoId });
    return response.data;
  }

  /**
   * Upload a standalone cover image. The image is stored outside the trip's photo
   * library, so it never appears in photos or memories. Replaces any existing cover.
   */
  async uploadCoverImage(tripId: number, file: File): Promise<Trip> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axios.post(`/trips/${tripId}/cover-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async deleteCoverImage(tripId: number): Promise<Trip> {
    const response = await axios.delete(`/trips/${tripId}/cover-image`);
    return response.data;
  }

  async validateTrip(tripId: number): Promise<ValidationResult> {
    const response = await axios.get(`/trips/${tripId}/validate`);
    return response.data;
  }

  async getValidationStatus(tripId: number): Promise<ValidationQuickStatus> {
    const response = await axios.get(`/trips/${tripId}/validation-status`);
    return response.data;
  }

  async dismissValidationIssue(
    tripId: number,
    issueType: string,
    issueKey: string,
    category: ValidationIssueCategory
  ): Promise<void> {
    await axios.post(`/trips/${tripId}/validation/dismiss`, {
      issueType,
      issueKey,
      category,
    });
  }

  async restoreValidationIssue(tripId: number, issueType: string, issueKey: string): Promise<void> {
    await axios.post(`/trips/${tripId}/validation/restore`, {
      issueType,
      issueKey,
    });
  }

  async duplicateTrip(tripId: number, data: DuplicateTripInput): Promise<Trip> {
    const response = await axios.post(`/trips/${tripId}/duplicate`, data);
    return response.data;
  }
}

export default new TripService();
