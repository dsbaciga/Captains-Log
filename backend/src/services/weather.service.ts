import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { WeatherDataInput } from '../types/weather.types';
import config from '../config';
import axios from 'axios';
import { verifyTripAccess } from '../utils/serviceHelpers';

interface OpenWeatherResponse {
  daily: {
    dt: number;
    temp: {
      min: number;
      max: number;
    };
    weather: {
      description: string;
      main: string;
    }[];
    pop: number; // Probability of precipitation (0-1)
    humidity: number;
    wind_speed: number;
  }[];
}

interface OpenWeatherHistoricalResponse {
  data: {
    dt: number;
    temp: number;
    humidity: number;
    wind_speed: number;
    weather: {
      description: string;
      main: string;
    }[];
  }[];
}

class WeatherService {
  private readonly API_KEY = config.openWeatherMap.apiKey;
  private readonly CACHE_HOURS = 6;

  /**
   * Get weather data for a trip's date range
   */
  async getWeatherForTrip(tripId: number, userId: number) {
    // Verify user owns the trip
    await verifyTripAccess(userId, tripId);

    // Get user's API key
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        user: {
          select: {
            weatherApiKey: true,
          },
        },
      },
    });

    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    // Check if trip has dates
    if (!trip.startDate || !trip.endDate) {
      return []; // No dates, no weather
    }

    // Get API key (user's key or system key)
    const apiKey = trip.user.weatherApiKey || this.API_KEY;

    if (!apiKey) {
      console.warn('No weather API key configured');
      return []; // No API key available
    }

    // Get coordinates for the trip
    const coordinates = await this.getTripCoordinates(tripId);

    if (!coordinates) {
      return []; // No coordinates available, can't fetch weather
    }

    // Generate array of dates in the trip range
    const dates = this.getDateRange(trip.startDate, trip.endDate);

    // Fetch or retrieve weather for each date
    const weatherData = await Promise.all(
      dates.map((date) => this.getWeatherForDate(tripId, coordinates, date, apiKey))
    );

    return weatherData.filter((w) => w !== null);
  }

  /**
   * Get weather for a specific date, using cache when appropriate
   */
  private async getWeatherForDate(
    tripId: number,
    coordinates: { lat: number; lon: number },
    date: Date,
    apiKey: string
  ) {
    const dateString = date.toISOString().split('T')[0];

    // Check if we have cached weather data
    const cached = await prisma.weatherData.findFirst({
      where: {
        tripId,
        date: new Date(dateString),
      },
    });

    // Determine if we should use the cache
    if (cached && !this.shouldRefreshWeather(cached, date)) {
      return cached;
    }

    // Fetch fresh weather data from API
    try {
      const weatherData = await this.fetchWeatherFromAPI(
        coordinates.lat,
        coordinates.lon,
        date,
        apiKey
      );

      // If API returned null (e.g., historical data unavailable), return cached or null
      if (!weatherData) {
        console.warn(`Weather data not available for date ${dateString}`);
        return cached || null;
      }

      // Save to database
      if (cached) {
        // Update existing record
        return await prisma.weatherData.update({
          where: { id: cached.id },
          data: {
            temperatureHigh: weatherData.temperatureHigh,
            temperatureLow: weatherData.temperatureLow,
            conditions: weatherData.conditions,
            precipitation: weatherData.precipitation,
            humidity: weatherData.humidity,
            windSpeed: weatherData.windSpeed,
            fetchedAt: new Date(),
          },
        });
      } else {
        // Create new record
        return await prisma.weatherData.create({
          data: {
            tripId,
            date: new Date(dateString),
            temperatureHigh: weatherData.temperatureHigh,
            temperatureLow: weatherData.temperatureLow,
            conditions: weatherData.conditions,
            precipitation: weatherData.precipitation,
            humidity: weatherData.humidity,
            windSpeed: weatherData.windSpeed,
            fetchedAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Failed to fetch weather from API:', error);
      // Return cached data if available, even if stale
      return cached || null;
    }
  }

  /**
   * Fetch weather from OpenWeatherMap API
   *
   * Uses One Call API 3.0 which requires a separate subscription:
   * - Forecast data: /data/3.0/onecall (8-day daily forecast)
   * - Historical data: /data/3.0/onecall/timemachine (requires paid subscription)
   *
   * Note: One Call API 3.0 provides 1,000 complimentary daily calls,
   * additional calls are billed on a pay-per-use basis.
   *
   * Returns null if historical data is unavailable (403 error for paid subscription)
   */
  private async fetchWeatherFromAPI(
    lat: number,
    lon: number,
    targetDate: Date,
    apiKey: string
  ): Promise<WeatherDataInput | null> {
    const now = new Date();
    const daysFromNow = Math.floor(
      (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Use One Call API 3.0 for forecast data
    // Supports current + 8-day daily forecast (0-7 days ahead)
    if (daysFromNow >= 0 && daysFromNow <= 7) {
      return await this.fetchForecastWeather(lat, lon, targetDate, daysFromNow, apiKey);
    }

    // For dates beyond 7 days in the future, use the last available forecast day
    if (daysFromNow > 7) {
      // Use day 7 forecast as placeholder
      return await this.fetchForecastWeather(lat, lon, targetDate, 7, apiKey);
    }

    // For past dates, try to fetch historical data
    // Note: Historical data requires a paid One Call API 3.0 subscription
    if (daysFromNow < 0) {
      return await this.fetchHistoricalWeather(lat, lon, targetDate, apiKey);
    }

    throw new AppError(
      'Unable to fetch weather data for this date',
      400
    );
  }

  /**
   * Fetch forecast weather from One Call API 3.0
   */
  private async fetchForecastWeather(
    lat: number,
    lon: number,
    targetDate: Date,
    dayIndex: number,
    apiKey: string
  ): Promise<WeatherDataInput> {
    const url = 'https://api.openweathermap.org/data/3.0/onecall';

    try {
      const response = await this.fetchWithRetry(url, {
        params: {
          lat,
          lon,
          exclude: 'current,minutely,hourly,alerts',
          units: 'imperial', // Default to Fahrenheit, can be made configurable
          appid: apiKey,
        },
      });

      const data = response as OpenWeatherResponse;

      if (!data.daily || !data.daily[dayIndex]) {
        throw new AppError('Weather data not available for this date', 404);
      }

      const dayData = data.daily[dayIndex];

      return {
        tripId: 0, // Will be set by caller
        date: targetDate.toISOString().split('T')[0],
        temperatureHigh: Math.round(dayData.temp.max),
        temperatureLow: Math.round(dayData.temp.min),
        conditions: dayData.weather[0]?.description || null,
        precipitation: Math.round(dayData.pop * 100), // Convert to percentage
        humidity: dayData.humidity,
        windSpeed: Math.round(dayData.wind_speed * 10) / 10, // Round to 1 decimal
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new AppError('Invalid OpenWeatherMap API key', 500);
      }
      throw error;
    }
  }

  /**
   * Fetch historical weather data from OpenWeatherMap Timemachine API
   * This uses the One Call API 3.0 Timemachine endpoint
   *
   * Note: Returns null gracefully if historical data is unavailable (403 error for paid subscription)
   */
  private async fetchHistoricalWeather(
    lat: number,
    lon: number,
    targetDate: Date,
    apiKey: string
  ): Promise<WeatherDataInput | null> {
    // Convert date to Unix timestamp (seconds)
    const timestamp = Math.floor(targetDate.getTime() / 1000);
    const url = 'https://api.openweathermap.org/data/3.0/onecall/timemachine';

    try {
      const response = await this.fetchWithRetry(url, {
        params: {
          lat,
          lon,
          dt: timestamp,
          units: 'imperial',
          appid: apiKey,
        },
      });

      const data = response as OpenWeatherHistoricalResponse;

      if (!data.data || data.data.length === 0) {
        throw new AppError('Historical weather data not available for this date', 404);
      }

      // The API returns hourly data for the requested day
      // We need to aggregate it to get min/max temperatures
      const hourlyData = data.data;
      const temps = hourlyData.map(h => h.temp);
      const humidities = hourlyData.map(h => h.humidity);
      const windSpeeds = hourlyData.map(h => h.wind_speed);

      // Get the most common weather condition
      const weatherDescriptions = hourlyData
        .map(h => h.weather[0]?.description)
        .filter(Boolean);
      const mostCommonCondition = this.getMostFrequent(weatherDescriptions) || null;

      return {
        tripId: 0, // Will be set by caller
        date: targetDate.toISOString().split('T')[0],
        temperatureHigh: Math.round(Math.max(...temps)),
        temperatureLow: Math.round(Math.min(...temps)),
        conditions: mostCommonCondition,
        precipitation: null, // Historical API doesn't provide precipitation probability
        humidity: Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length),
        windSpeed: Math.round((windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length) * 10) / 10,
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new AppError('Invalid OpenWeatherMap API key', 500);
      }
      if (error.response?.status === 403) {
        // Historical data requires paid subscription - log and return null gracefully
        console.warn(`Historical weather data not available (requires paid OpenWeatherMap subscription) for date: ${targetDate.toISOString().split('T')[0]}`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Helper to find most frequent element in array
   */
  private getMostFrequent(arr: string[]): string | null {
    if (arr.length === 0) return null;

    const frequency: Record<string, number> = {};
    let maxFreq = 0;
    let mostFrequent = arr[0];

    for (const item of arr) {
      frequency[item] = (frequency[item] || 0) + 1;
      if (frequency[item] > maxFreq) {
        maxFreq = frequency[item];
        mostFrequent = item;
      }
    }

    return mostFrequent;
  }

  /**
   * Fetch with retry logic for rate limiting
   */
  private async fetchWithRetry(
    url: string,
    config: any,
    retries = 3
  ): Promise<any> {
    try {
      const response = await axios.get(url, config);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429 && retries > 0) {
        // Rate limited, wait and retry
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return this.fetchWithRetry(url, config, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Determine if cached weather data should be refreshed
   */
  private shouldRefreshWeather(
    weatherData: { date: Date; fetchedAt: Date },
    targetDate: Date
  ): boolean {
    const now = new Date();
    const today = new Date(now.toDateString());
    const weatherDate = new Date(targetDate.toDateString());

    // Past dates never refresh
    if (weatherDate < today) {
      return false;
    }

    // Future dates refresh after CACHE_HOURS
    const hoursSinceFetch =
      (now.getTime() - weatherData.fetchedAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceFetch > this.CACHE_HOURS;
  }

  /**
   * Get coordinates for a trip using fallback strategy
   */
  private async getTripCoordinates(
    tripId: number
  ): Promise<{ lat: number; lon: number } | null> {
    // 1. Try to get first location with coordinates
    const location = await prisma.location.findFirst({
      where: {
        tripId,
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { visitDatetime: 'asc' },
    });

    if (location?.latitude && location?.longitude) {
      return {
        lat: parseFloat(location.latitude.toString()),
        lon: parseFloat(location.longitude.toString()),
      };
    }

    // 2. Fallback: check activities with locations
    const activity = await prisma.activity.findFirst({
      where: { tripId },
      include: {
        location: true,
      },
      orderBy: { startTime: 'asc' },
    });

    if (
      activity?.location?.latitude &&
      activity.location?.longitude
    ) {
      return {
        lat: parseFloat(activity.location.latitude.toString()),
        lon: parseFloat(activity.location.longitude.toString()),
      };
    }

    // 3. Fallback: check lodging with locations
    const lodging = await prisma.lodging.findFirst({
      where: { tripId },
      include: {
        location: true,
      },
      orderBy: { checkInDate: 'asc' },
    });

    if (
      lodging?.location?.latitude &&
      lodging.location?.longitude
    ) {
      return {
        lat: parseFloat(lodging.location.latitude.toString()),
        lon: parseFloat(lodging.location.longitude.toString()),
      };
    }

    return null; // No coordinates available
  }

  /**
   * Generate array of dates between start and end (inclusive)
   */
  private getDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * Force refresh weather for a specific date
   */
  async refreshWeatherForDate(
    tripId: number,
    userId: number,
    dateString: string
  ) {
    // Verify user owns the trip
    await verifyTripAccess(userId, tripId);

    // Get user's API key
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        user: {
          select: {
            weatherApiKey: true,
          },
        },
      },
    });

    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    // Get API key (user's key or system key)
    const apiKey = trip.user.weatherApiKey || this.API_KEY;

    if (!apiKey) {
      throw new AppError('No weather API key configured', 400);
    }

    // Get coordinates
    const coordinates = await this.getTripCoordinates(tripId);

    if (!coordinates) {
      throw new AppError('No coordinates available for this trip', 400);
    }

    // Delete existing weather data to force refresh
    await prisma.weatherData.deleteMany({
      where: {
        tripId,
        date: new Date(dateString),
      },
    });

    // Fetch fresh data
    const targetDate = new Date(dateString);
    return await this.getWeatherForDate(tripId, coordinates, targetDate, apiKey);
  }
}

export default new WeatherService();
