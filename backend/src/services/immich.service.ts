import axios, { AxiosInstance } from 'axios';
import { AppError } from '../utils/errors';
import {
  ImmichAsset,
  ImmichAlbum,
  ImmichAssetOptions,
  ImmichSearchQuery,
  isAxiosError,
  getErrorMessage,
} from '../types/prisma-helpers';

// Re-export types for backward compatibility
export type { ImmichAsset, ImmichAlbum, ImmichAssetOptions };

/**
 * Immich search response structure
 */
export interface ImmichSearchResponse {
  assets: {
    items: ImmichAsset[];
    nextPage: string | null;
  };
  albums: ImmichAlbum[];
}

/**
 * Immich album with assets included (extended type for album detail responses)
 */
export interface ImmichAlbumWithAssets extends ImmichAlbum {
  assets: ImmichAsset[];
}

/**
 * Extended search query with additional search fields
 */
export interface ImmichMetadataSearchQuery extends ImmichSearchQuery {
  q?: string;
  searchTerm?: string;
  state?: string;
}

class ImmichService {
  private createClient(apiUrl: string, apiKey: string): AxiosInstance {
    // IMPORTANT: apiUrl should be the base Immich server URL WITHOUT /api suffix
    // (e.g., https://immich.example.com, NOT https://immich.example.com/api)
    // All endpoint paths in this service include /api/ prefix
    const baseURL = apiUrl.trim();
    return axios.create({
      baseURL,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Test connection to Immich instance
   */
  async testConnection(apiUrl: string, apiKey: string): Promise<boolean> {
    try {
      const client = this.createClient(apiUrl, apiKey);
      const response = await client.get('/api/server/ping');
      return response.status === 200;
    } catch (error: unknown) {
      // Log error details without exposing full URLs or API keys
      const errorMessage = getErrorMessage(error);
      let errorCode = 'Unknown';
      let responseStatus: number | undefined;

      if (isAxiosError(error)) {
        errorCode = error.code || 'Unknown';
        responseStatus = error.response?.status;
      }

      console.error('[Immich Service] Connection error:', errorCode, '-', errorMessage);

      if (errorCode === 'ECONNREFUSED') {
        if (process.env.NODE_ENV === 'development') {
          console.error(`[Immich Service] Cannot connect to Immich at ${apiUrl}: Server refused connection`);
        }
        throw new AppError('Cannot connect to Immich server. Please check your configuration and ensure the server is running.', 400);
      } else if (errorCode === 'ENOTFOUND') {
        if (process.env.NODE_ENV === 'development') {
          console.error(`[Immich Service] Cannot resolve hostname for ${apiUrl}: DNS resolution failed`);
        }
        throw new AppError('Cannot connect to Immich server. Please check your configuration and network settings.', 400);
      } else if (errorCode === 'ETIMEDOUT') {
        if (process.env.NODE_ENV === 'development') {
          console.error(`[Immich Service] Connection to ${apiUrl} timed out after 30 seconds`);
        }
        throw new AppError('Connection to Immich server timed out. Please check network firewall rules.', 408);
      } else if (errorCode === 'DEPTH_ZERO_SELF_SIGNED_CERT' || errorCode === 'CERT_HAS_EXPIRED' || errorCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        if (process.env.NODE_ENV === 'development') {
          console.error(`[Immich Service] SSL certificate error for ${apiUrl}: ${errorCode}`);
        }
        throw new AppError('SSL certificate error. The Immich server has an invalid or self-signed certificate.', 400);
      } else if (responseStatus === 401 || responseStatus === 403) {
        throw new AppError('Invalid Immich API key. Check your API key in user settings.', 401);
      } else if (responseStatus === 404) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`[Immich Service] API endpoint not found at ${apiUrl}`);
        }
        throw new AppError('Immich API endpoint not found. Please check that your URL is correct and points to your Immich server.', 404);
      }
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Immich Service] Connection failed to ${apiUrl}: ${errorMessage} (Code: ${errorCode})`);
      } else {
        console.error(`[Immich Service] Connection failed: ${errorMessage} (Code: ${errorCode})`);
      }
      throw new AppError('Failed to connect to Immich server. Please check your configuration.', 400);
    }
  }

  /**
   * Get user's Immich assets with pagination
   */
  async getAssets(
    apiUrl: string,
    apiKey: string,
    options?: ImmichAssetOptions
  ): Promise<{ assets: ImmichAsset[]; total: number }> {
    try {
      const client = this.createClient(apiUrl, apiKey);

      // Use search/metadata endpoint with no filters to get all assets
      const searchQuery: ImmichSearchQuery = {};
      if (options?.isFavorite !== undefined) {
        searchQuery.isFavorite = options.isFavorite;
      }
      if (options?.isArchived !== undefined) {
        searchQuery.isArchived = options.isArchived;
      }

      const response = await client.post('/api/search/metadata', searchQuery);
      const assets = response.data.assets?.items || [];

      // Apply pagination manually (only if pagination options are provided)
      if (options && (options.skip !== undefined || options.take !== undefined)) {
        const skip = options.skip || 0;
        const take = options.take || 100;
        const paginatedAssets = assets.slice(skip, skip + take);

        return {
          assets: paginatedAssets,
          total: assets.length,
        };
      }

      // No pagination requested - return all assets
      return {
        assets: assets,
        total: assets.length,
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const errorCode = isAxiosError(error) ? error.code || 'Unknown' : 'Unknown';
      console.error('[Immich Service] Error fetching assets:', errorCode, '-', errorMessage);
      throw new AppError(`Failed to fetch assets from Immich: ${errorMessage}`, 500);
    }
  }

  /**
   * Get a single asset by ID
   */
  async getAssetById(
    apiUrl: string,
    apiKey: string,
    assetId: string
  ): Promise<ImmichAsset> {
    try {
      const client = this.createClient(apiUrl, apiKey);
      const response = await client.get(`/api/assets/${assetId}`);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Error fetching Immich asset:', errorMessage);
      throw new AppError('Failed to fetch asset from Immich', 404);
    }
  }

  /**
   * Get asset thumbnail URL - returns our backend proxy URL
   */
  getAssetThumbnailUrl(_apiUrl: string, assetId: string, _apiKey: string): string {
    // Return our backend proxy URL instead of direct Immich URL
    return `/api/immich/assets/${assetId}/thumbnail`;
  }

  /**
   * Get asset original file URL - returns our backend proxy URL
   */
  getAssetFileUrl(_apiUrl: string, assetId: string, _apiKey: string): string {
    // Return our backend proxy URL instead of direct Immich URL
    return `/api/immich/assets/${assetId}/original`;
  }

  /**
   * Get asset thumbnail stream from Immich
   */
  async getAssetThumbnailStream(
    apiUrl: string,
    apiKey: string,
    assetId: string
  ): Promise<{ stream: NodeJS.ReadableStream; contentType: string }> {
    try {
      const client = this.createClient(apiUrl, apiKey);

      const response = await client.get(`/api/assets/${assetId}/thumbnail`, {
        params: { size: 'preview' }, // Required query parameter for Immich API
        responseType: 'stream',
      });

      return {
        stream: response.data,
        contentType: response.headers['content-type'] || 'image/jpeg',
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const errorCode = isAxiosError(error) ? error.code || 'Unknown' : 'Unknown';
      console.error('[Immich Service] Error fetching thumbnail:', errorCode, '-', errorMessage);
      throw new AppError('Failed to fetch thumbnail from Immich', 500);
    }
  }

  /**
   * Get asset original file stream from Immich
   */
  async getAssetOriginalStream(
    apiUrl: string,
    apiKey: string,
    assetId: string
  ): Promise<{ stream: NodeJS.ReadableStream; contentType: string }> {
    try {
      const client = this.createClient(apiUrl, apiKey);
      const response = await client.get(`/api/assets/${assetId}/original`, {
        responseType: 'stream',
      });

      return {
        stream: response.data,
        contentType: response.headers['content-type'] || 'application/octet-stream',
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Error fetching original file stream:', errorMessage);
      throw new AppError('Failed to fetch original file from Immich', 500);
    }
  }

  /**
   * Search assets by metadata
   */
  async searchAssets(
    apiUrl: string,
    apiKey: string,
    query: ImmichMetadataSearchQuery
  ): Promise<ImmichAsset[]> {
    try {
      const client = this.createClient(apiUrl, apiKey);
      const response = await client.post('/api/search/metadata', query);
      return response.data.assets?.items || [];
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Error searching Immich assets:', errorMessage);
      throw new AppError('Failed to search assets in Immich', 500);
    }
  }

  /**
   * Get all albums
   */
  async getAlbums(
    apiUrl: string,
    apiKey: string,
    shared?: boolean
  ): Promise<ImmichAlbum[]> {
    try {
      const client = this.createClient(apiUrl, apiKey);
      const params = shared !== undefined ? { shared } : {};
      const response = await client.get('/api/albums', { params });
      return response.data;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Error fetching Immich albums:', errorMessage);
      throw new AppError('Failed to fetch albums from Immich', 500);
    }
  }

  /**
   * Get album by ID with its assets
   */
  async getAlbumById(
    apiUrl: string,
    apiKey: string,
    albumId: string
  ): Promise<ImmichAlbumWithAssets> {
    try {
      const client = this.createClient(apiUrl, apiKey);
      const response = await client.get(`/api/albums/${albumId}`);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Error fetching Immich album:', errorMessage);
      throw new AppError('Failed to fetch album from Immich', 404);
    }
  }

  /**
   * Get assets within a date range with pagination
   */
  async getAssetsByDateRange(
    apiUrl: string,
    apiKey: string,
    startDate: string,
    endDate: string,
    options?: Pick<ImmichAssetOptions, 'skip' | 'take'>
  ): Promise<{ assets: ImmichAsset[]; total: number }> {
    try {
      const client = this.createClient(apiUrl, apiKey);

      // Fetch all pages from Immich using nextPage cursor
      let allAssets: ImmichAsset[] = [];
      let nextPage: string | null = null;
      let pageNum = 1;

      do {
        const requestBody: { takenAfter: string; takenBefore: string; page?: string } = {
          takenAfter: startDate,
          takenBefore: endDate,
        };

        if (nextPage) {
          requestBody.page = nextPage;
        }

        const response = await client.post('/api/search/metadata', requestBody);
        const pageAssets = response.data.assets?.items || response.data.assets || [];

        allAssets = allAssets.concat(pageAssets);
        nextPage = response.data.assets?.nextPage || null;
        pageNum++;

        // Safety check to avoid infinite loops
        if (pageNum > 100) {
          console.warn('[Immich Service] Reached maximum page limit (100), stopping pagination');
          break;
        }
      } while (nextPage);

      // Apply our own pagination (only if pagination options are provided)
      if (options && (options.skip !== undefined || options.take !== undefined)) {
        const skip = options.skip || 0;
        const take = options.take || 100;
        const paginatedAssets = allAssets.slice(skip, skip + take);

        return {
          assets: paginatedAssets,
          total: allAssets.length,
        };
      }

      // No pagination requested - return all assets
      return {
        assets: allAssets,
        total: allAssets.length,
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const errorCode = isAxiosError(error) ? error.code || 'Unknown' : 'Unknown';
      console.error('[Immich Service] Error fetching assets by date range:', errorCode, '-', errorMessage);
      throw new AppError('Failed to fetch assets by date range', 500);
    }
  }
}

export default new ImmichService();
