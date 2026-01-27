import api from './api.service';
import { FlightTracking } from '../types/transportation';

export interface UpdateFlightTrackingInput {
  flightNumber?: string | null;
  airlineCode?: string | null;
  gate?: string | null;
  terminal?: string | null;
  baggageClaim?: string | null;
  status?: 'scheduled' | 'active' | 'landed' | 'cancelled' | 'diverted' | null;
}

class FlightTrackingService {
  /**
   * Get flight status for a transportation record
   */
  async getFlightStatus(transportationId: number): Promise<FlightTracking | null> {
    const response = await api.get<{ status: string; data: FlightTracking | null }>(
      `/transportation/${transportationId}/flight-status`
    );
    return response.data.data;
  }

  /**
   * Manually update flight tracking info
   */
  async updateFlightTracking(
    transportationId: number,
    data: UpdateFlightTrackingInput
  ): Promise<FlightTracking> {
    const response = await api.put<{ status: string; data: FlightTracking }>(
      `/transportation/${transportationId}/flight-status`,
      data
    );
    return response.data.data;
  }

  /**
   * Refresh flight status for all flights in a trip
   */
  async refreshFlightsForTrip(tripId: number): Promise<FlightTracking[]> {
    const response = await api.post<{ status: string; data: FlightTracking[]; message: string }>(
      `/trips/${tripId}/flights/refresh`
    );
    return response.data.data;
  }
}

export default new FlightTrackingService();
