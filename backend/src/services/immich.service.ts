import axios, { AxiosInstance } from 'axios';
import { AppError } from '../utils/errors';

export interface ImmichAsset {
  id: string;
  deviceAssetId: string;
  ownerId: string;
  deviceId: string;
  type: 'IMAGE' | 'VIDEO';
  originalPath: string;
  originalFileName: string;
  resized: boolean;
  thumbhash: string | null;
  fileCreatedAt: string;
  fileModifiedAt: string;
  updatedAt: string;
  isFavorite: boolean;
  isArchived: boolean;
  duration: string | null;
  exifInfo?: {
    latitude?: number;
    longitude?: number;
    dateTimeOriginal?: string;
    make?: string;
    model?: string;
    lensModel?: string;
    fNumber?: number;
    focalLength?: number;
    iso?: number;
    exposureTime?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export interface ImmichAlbum {
  id: string;
  ownerId: string;
  albumName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  albumThumbnailAssetId: string | null;
  shared: boolean;
  assets: ImmichAsset[];
  assetCount: number;
}

export interface ImmichSearchResponse {
  assets: {
    items: ImmichAsset[];
    nextPage: string | null;
  };
  albums: ImmichAlbum[];
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
    } catch (error) {
      // Log error details without exposing full URLs or API keys
      const axiosError = error as { code?: string; message?: string; response?: { status?: number } };
      const errorCode = axiosError.code || 'Unknown';
      const errorMessage = axiosError.message || 'Unknown error';
      console.error('[Immich Service] Connection error:', errorCode, '-', errorMessage);

      if (axiosError.code === 'ECONNREFUSED') {
        throw new AppError(`Cannot connect to Immich at ${apiUrl}. Server refused connection. Check if Immich is running and accessible from this container.`, 400);
      } else if (axiosError.code === 'ENOTFOUND') {
        throw new AppError(`Cannot resolve hostname: ${apiUrl}. DNS resolution failed. Check network configuration.`, 400);
      } else if (axiosError.code === 'ETIMEDOUT') {
        throw new AppError(`Connection to Immich timed out after 30 seconds. Check network firewall rules.`, 408);
      } else if (axiosError.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || axiosError.code === 'CERT_HAS_EXPIRED' || axiosError.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        throw new AppError(`SSL certificate error: ${axiosError.code}. The SSL certificate for ${apiUrl} is invalid or self-signed.`, 400);
      } else if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        throw new AppError('Invalid Immich API key. Check your API key in user settings.', 401);
      } else if (axiosError.response?.status === 404) {
        throw new AppError(`Immich API endpoint not found. Check that the URL is correct and points to your Immich server (not just a web page). URL: ${apiUrl}`, 404);
      }
      throw new AppError(`Failed to connect to Immich: ${errorMessage} (Code: ${errorCode})`, 400);
    }
  }

  /**
   * Get user's Immich assets with pagination
   */
  async getAssets(
    apiUrl: string,
    apiKey: string,
    options?: {
      skip?: number;
      take?: number;
      isFavorite?: boolean;
      isArchived?: boolean;
    }
  ): Promise<{ assets: ImmichAsset[]; total: number }> {
    try {
      const client = this.createClient(apiUrl, apiKey);

      // Use search/metadata endpoint with no filters to get all assets
      const searchQuery: { isFavorite?: boolean; isArchived?: boolean } = {};
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as { code?: string }).code || 'Unknown';
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as { code?: string }).code || 'Unknown';
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
    query: {
      q?: string;
      searchTerm?: string;
      city?: string;
      state?: string;
      country?: string;
      make?: string;
      model?: string;
      takenAfter?: string;
      takenBefore?: string;
    }
  ): Promise<ImmichAsset[]> {
    try {
      const client = this.createClient(apiUrl, apiKey);
      const response = await client.post('/api/search/metadata', query);
      return response.data.assets?.items || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
  ): Promise<ImmichAlbum> {
    try {
      const client = this.createClient(apiUrl, apiKey);
      const response = await client.get(`/api/albums/${albumId}`);
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
    options?: {
      skip?: number;
      take?: number;
    }
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as { code?: string }).code || 'Unknown';
      console.error('[Immich Service] Error fetching assets by date range:', errorCode, '-', errorMessage);
      throw new AppError('Failed to fetch assets by date range', 500);
    }
  }
}

export default new ImmichService();
