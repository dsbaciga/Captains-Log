import axios from '../lib/axios';
import type { WeatherData } from '../types/weather';

class WeatherService {
  /**
   * Get weather data for all days in a trip
   */
  async getWeatherForTrip(tripId: number): Promise<WeatherData[]> {
    const response = await axios.get(`/trips/${tripId}/weather`);
    return response.data.data;
  }

  /**
   * Force refresh weather for a specific date
   */
  async refreshWeather(tripId: number, date: string): Promise<WeatherData> {
    const response = await axios.post(`/trips/${tripId}/weather/refresh`, {
      date,
    });
    return response.data.data;
  }
}

export default new WeatherService();
