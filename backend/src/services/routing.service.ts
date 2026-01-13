import axios from 'axios';
import config from '../config';
import { AppError } from '../utils/errors';
import prisma from '../config/database';

interface RouteCoordinates {
  latitude: number;
  longitude: number;
}

interface OpenRouteServiceResponse {
  routes: Array<{
    summary: {
      distance: number; // in meters
      duration: number; // in seconds
    };
    segments: Array<{
      distance: number;
      duration: number;
      steps: any[];
    }>;
    geometry: {
      coordinates: number[][];
      type: string;
    };
  }>;
}

interface RouteResult {
  distance: number; // in kilometers
  duration: number; // in minutes
  haversineDistance: number; // fallback distance in kilometers
  source: 'route' | 'haversine';
  geometry?: number[][]; // Array of [longitude, latitude] coordinates
}

interface RouteCacheEntry {
  id: number;
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  distance: number; // in kilometers
  duration: number; // in minutes
  profile: string;
  routeGeometry?: any; // JSON field with coordinates
  createdAt: Date;
  updatedAt: Date;
}

class RoutingService {
  private readonly API_KEY = config.openRouteService.apiKey;
  private readonly API_URL = config.openRouteService.url || 'https://api.openrouteservice.org';
  private readonly CACHE_DAYS = 30; // Cache routes for 30 days

  /**
   * Calculate route distance and duration between two points
   * Falls back to Haversine formula if routing service is unavailable
   */
  async calculateRoute(
    from: RouteCoordinates,
    to: RouteCoordinates,
    profile: 'driving-car' | 'cycling-regular' | 'foot-walking' = 'driving-car'
  ): Promise<RouteResult> {
    // Check cache first
    const cached = await this.getCachedRoute(from, to, profile);
    if (cached) {
      console.log('[Routing Service] Using cached route');
      return {
        distance: cached.distance,
        duration: cached.duration,
        haversineDistance: this.calculateHaversineDistance(from, to),
        source: 'route',
        geometry: cached.routeGeometry as number[][] | undefined,
      };
    }

    // Try to fetch from OpenRouteService
    if (this.API_KEY) {
      try {
        const routeData = await this.fetchRouteFromAPI(from, to, profile);

        // Cache the result
        await this.cacheRoute(from, to, routeData.distance, routeData.duration, profile, routeData.geometry);

        return {
          distance: routeData.distance,
          duration: routeData.duration,
          haversineDistance: this.calculateHaversineDistance(from, to),
          source: 'route',
          geometry: routeData.geometry,
        };
      } catch (error) {
        console.warn('[Routing Service] Failed to fetch route from API, falling back to Haversine:', error);
      }
    } else {
      console.warn('[Routing Service] No API key configured, using Haversine formula');
    }

    // Fallback to Haversine
    const haversineDistance = this.calculateHaversineDistance(from, to);
    return {
      distance: haversineDistance,
      duration: this.estimateDuration(haversineDistance, profile),
      haversineDistance,
      source: 'haversine',
    };
  }

  /**
   * Fetch route from OpenRouteService API
   */
  private async fetchRouteFromAPI(
    from: RouteCoordinates,
    to: RouteCoordinates,
    profile: string
  ): Promise<{ distance: number; duration: number; geometry?: number[][] }> {
    const url = `${this.API_URL}/v2/directions/${profile}/json`;

    // OpenRouteService expects coordinates as [longitude, latitude]
    const coordinates = [
      [from.longitude, from.latitude],
      [to.longitude, to.latitude],
    ];

    try {
      const response = await axios.post<OpenRouteServiceResponse>(
        url,
        { coordinates },
        {
          headers: {
            'Authorization': this.API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        }
      );

      if (!response.data.routes || response.data.routes.length === 0) {
        throw new Error('No routes found in response');
      }

      const route = response.data.routes[0];

      return {
        distance: route.summary.distance / 1000, // Convert meters to kilometers
        duration: route.summary.duration / 60, // Convert seconds to minutes
        geometry: route.geometry?.coordinates, // Array of [longitude, latitude]
      };
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new AppError('Invalid OpenRouteService API key', 401);
      }
      if (error.response?.status === 429) {
        throw new AppError('OpenRouteService rate limit exceeded', 429);
      }
      throw new Error(`OpenRouteService API error: ${error.message}`);
    }
  }

  /**
   * Calculate straight-line distance using Haversine formula
   * Returns distance in kilometers
   */
  private calculateHaversineDistance(from: RouteCoordinates, to: RouteCoordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(to.latitude - from.latitude);
    const dLon = this.toRad(to.longitude - from.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(from.latitude)) *
        Math.cos(this.toRad(to.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Estimate duration based on distance and travel mode
   * Returns duration in minutes
   */
  private estimateDuration(distanceKm: number, profile: string): number {
    // Average speeds in km/h
    const speeds: Record<string, number> = {
      'driving-car': 80,
      'cycling-regular': 20,
      'foot-walking': 5,
    };

    const speed = speeds[profile] || 80;
    return (distanceKm / speed) * 60; // Convert hours to minutes
  }

  /**
   * Get cached route from database
   */
  private async getCachedRoute(
    from: RouteCoordinates,
    to: RouteCoordinates,
    profile: string
  ): Promise<RouteCacheEntry | null> {
    // Find routes within a small tolerance (0.001 degrees ~ 100 meters)
    const tolerance = 0.001;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.CACHE_DAYS);

    try {
      const cached = await prisma.routeCache.findFirst({
        where: {
          profile,
          fromLat: {
            gte: from.latitude - tolerance,
            lte: from.latitude + tolerance,
          },
          fromLon: {
            gte: from.longitude - tolerance,
            lte: from.longitude + tolerance,
          },
          toLat: {
            gte: to.latitude - tolerance,
            lte: to.latitude + tolerance,
          },
          toLon: {
            gte: to.longitude - tolerance,
            lte: to.longitude + tolerance,
          },
          createdAt: {
            gte: cutoffDate,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (cached) {
        return {
          ...cached,
          fromLat: parseFloat(cached.fromLat.toString()),
          fromLon: parseFloat(cached.fromLon.toString()),
          toLat: parseFloat(cached.toLat.toString()),
          toLon: parseFloat(cached.toLon.toString()),
          distance: parseFloat(cached.distance.toString()),
          duration: parseFloat(cached.duration.toString()),
        };
      }

      return null;
    } catch (error) {
      console.warn('[Routing Service] Error checking cache:', error);
      return null;
    }
  }

  /**
   * Cache a route in the database
   */
  private async cacheRoute(
    from: RouteCoordinates,
    to: RouteCoordinates,
    distance: number,
    duration: number,
    profile: string,
    geometry?: number[][]
  ): Promise<void> {
    try {
      await prisma.routeCache.create({
        data: {
          fromLat: from.latitude,
          fromLon: from.longitude,
          toLat: to.latitude,
          toLon: to.longitude,
          distance,
          duration,
          profile,
          routeGeometry: geometry || null,
        },
      });
    } catch (error) {
      console.warn('[Routing Service] Error caching route:', error);
      // Don't throw - caching failure shouldn't break the request
    }
  }

  /**
   * Clean up old cache entries (call periodically)
   */
  async cleanupCache(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.CACHE_DAYS);

    try {
      const result = await prisma.routeCache.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      console.log(`[Routing Service] Cleaned up ${result.count} old cache entries`);
      return result.count;
    } catch (error) {
      console.error('[Routing Service] Error cleaning cache:', error);
      return 0;
    }
  }
}

export default new RoutingService();
