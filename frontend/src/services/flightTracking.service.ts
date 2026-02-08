import axios from '../lib/axios';
import type { FlightTracking } from '../types/transportation';

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
    // Note: axios interceptor unwraps { status, data } -> data automatically
    const response = await axios.get<FlightTracking | null>(
      `/transportation/${transportationId}/flight-status`
    );
    return response.data;
  }

  /**
   * Manually update flight tracking info
   */
  async updateFlightTracking(
    transportationId: number,
    data: UpdateFlightTrackingInput
  ): Promise<FlightTracking> {
    const response = await axios.put<FlightTracking>(
      `/transportation/${transportationId}/flight-status`,
      data
    );
    return response.data;
  }

  /**
   * Refresh flight status for all flights in a trip
   */
  async refreshFlightsForTrip(tripId: number): Promise<FlightTracking[]> {
    const response = await axios.post<FlightTracking[]>(
      `/trips/${tripId}/flights/refresh`
    );
    return response.data;
  }
}

export default new FlightTrackingService();
