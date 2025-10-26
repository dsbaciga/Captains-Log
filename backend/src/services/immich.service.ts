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
    console.log('Creating Immich client with baseURL:', baseURL);
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
      console.log('[Immich Service] Testing connection to:', apiUrl);
      console.log('[Immich Service] Full URL:', `${apiUrl}/api/server/ping`);
      const response = await client.get('/api/server/ping');
      console.log('[Immich Service] Connection test successful, status:', response.status);
      return response.status === 200;
    } catch (error: any) {
      console.error('[Immich Service] Connection error details:');
      console.error('  - Error message:', error.message);
      console.error('  - Error code:', error.code);
      console.error('  - URL attempted:', apiUrl);
      console.error('  - Response status:', error.response?.status);
      console.error('  - Response data:', error.response?.data);
      console.error('  - Full error:', error);

      if (error.code === 'ECONNREFUSED') {
        throw new AppError(`Cannot connect to Immich at ${apiUrl}. Server refused connection. Check if Immich is running and accessible from this container.`, 400);
      } else if (error.code === 'ENOTFOUND') {
        throw new AppError(`Cannot resolve hostname: ${apiUrl}. DNS resolution failed. Check network configuration.`, 400);
      } else if (error.code === 'ETIMEDOUT') {
        throw new AppError(`Connection to Immich timed out after 30 seconds. Check network firewall rules.`, 408);
      } else if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        throw new AppError(`SSL certificate error: ${error.code}. The SSL certificate for ${apiUrl} is invalid or self-signed.`, 400);
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        throw new AppError('Invalid Immich API key. Check your API key in user settings.', 401);
      } else if (error.response?.status === 404) {
        throw new AppError(`Immich API endpoint not found. Check that the URL is correct and points to your Immich server (not just a web page). URL: ${apiUrl}`, 404);
      }
      throw new AppError(`Failed to connect to Immich: ${error.message} (Code: ${error.code || 'Unknown'})`, 400);
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
      const searchQuery: any = {};
      if (options?.isFavorite !== undefined) {
        searchQuery.isFavorite = options.isFavorite;
      }
      if (options?.isArchived !== undefined) {
        searchQuery.isArchived = options.isArchived;
      }

      const response = await client.post('/api/search/metadata', searchQuery);
      const assets = response.data.assets?.items || [];

      // Apply pagination manually since search might return all results
      const skip = options?.skip || 0;
      const take = options?.take || 100;
      const paginatedAssets = assets.slice(skip, skip + take);

      return {
        assets: paginatedAssets,
        total: assets.length,
      };
    } catch (error: any) {
      console.error('[Immich Service] Error fetching assets:', error.message);
      console.error('[Immich Service] Error code:', error.code);
      console.error('[Immich Service] Response status:', error.response?.status);
      console.error('[Immich Service] Response data:', error.response?.data);
      throw new AppError(`Failed to fetch assets from Immich: ${error.message}`, 500);
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
    } catch (error: any) {
      console.error('Error fetching Immich asset:', error.message);
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
  ): Promise<{ stream: any; contentType: string }> {
    try {
      const client = this.createClient(apiUrl, apiKey);
      const fullUrl = `${client.defaults.baseURL}/api/assets/${assetId}/thumbnail`;
      console.log(`[Immich Service] Fetching thumbnail from: ${fullUrl}`);

      const response = await client.get(`/api/assets/${assetId}/thumbnail`, {
        params: { size: 'preview' }, // Required query parameter for Immich API
        responseType: 'stream',
      });

      console.log(`[Immich Service] Thumbnail fetch successful, status: ${response.status}`);
      console.log(`[Immich Service] Content-Type: ${response.headers['content-type']}`);

      return {
        stream: response.data,
        contentType: response.headers['content-type'] || 'image/jpeg',
      };
    } catch (error: any) {
      console.error('[Immich Service] Error fetching thumbnail stream:', error.message);
      console.error('[Immich Service] Asset ID:', assetId);
      console.error('[Immich Service] API URL:', apiUrl);
      console.error('[Immich Service] Full URL attempted:', `${apiUrl}/api/assets/${assetId}/thumbnail`);
      console.error('[Immich Service] Response status:', error.response?.status);
      console.error('[Immich Service] Response data:', error.response?.data);
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
  ): Promise<{ stream: any; contentType: string }> {
    try {
      const client = this.createClient(apiUrl, apiKey);
      const response = await client.get(`/api/assets/${assetId}/original`, {
        responseType: 'stream',
      });

      return {
        stream: response.data,
        contentType: response.headers['content-type'] || 'application/octet-stream',
      };
    } catch (error: any) {
      console.error('Error fetching original file stream:', error.message);
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
    } catch (error: any) {
      console.error('Error searching Immich assets:', error.message);
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
    } catch (error: any) {
      console.error('Error fetching Immich albums:', error.message);
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
    } catch (error: any) {
      console.error('Error fetching Immich album:', error.message);
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
      console.log('Fetching assets by date range from:', apiUrl);
      console.log('Date range:', startDate, 'to', endDate);
      console.log('Pagination options:', options);

      // Fetch all pages from Immich using nextPage cursor
      let allAssets: ImmichAsset[] = [];
      let nextPage: string | null = null;
      let pageNum = 1;

      do {
        console.log(`Fetching page ${pageNum}${nextPage ? ` with cursor: ${nextPage}` : ' (initial)'}`);
        const requestBody: any = {
          takenAfter: startDate,
          takenBefore: endDate,
        };

        if (nextPage) {
          requestBody.page = nextPage;
        }

        const response = await client.post('/api/search/metadata', requestBody);
        const pageAssets = response.data.assets?.items || response.data.assets || [];
        console.log(`Page ${pageNum}: received ${pageAssets.length} assets`);

        allAssets = allAssets.concat(pageAssets);
        nextPage = response.data.assets?.nextPage || null;
        pageNum++;

        // Safety check to avoid infinite loops
        if (pageNum > 100) {
          console.warn('Reached maximum page limit (100), stopping pagination');
          break;
        }
      } while (nextPage);

      console.log(`Total assets fetched from Immich: ${allAssets.length}`);

      // Apply our own pagination
      const skip = options?.skip || 0;
      const take = options?.take || 100;
      const paginatedAssets = allAssets.slice(skip, skip + take);
      console.log(`Returning ${paginatedAssets.length} assets (skip: ${skip}, take: ${take})`);

      if (paginatedAssets.length > 0) {
        console.log('First asset sample:', { id: paginatedAssets[0].id, type: paginatedAssets[0].type });
      }

      return {
        assets: paginatedAssets,
        total: allAssets.length,
      };
    } catch (error: any) {
      console.error('Error fetching assets by date range:', error.message);
      console.error('Request URL was:', error.config?.url);
      console.error('Full error:', error.response?.status, error.response?.data);
      throw new AppError('Failed to fetch assets by date range', 500);
    }
  }
}

export default new ImmichService();
