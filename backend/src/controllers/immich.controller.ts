import { Request, Response } from 'express';
import immichService from '../services/immich.service';
import prisma from '../config/database';
import { AppError } from '../utils/errors';

export class ImmichController {
  /**
   * Test connection to user's Immich instance
   */
  async testConnection(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401);
      }

      const { apiUrl, apiKey } = req.body;

      if (!apiUrl || !apiKey) {
        throw new AppError('API URL and API Key are required', 400);
      }

      const isConnected = await immichService.testConnection(apiUrl, apiKey);

      res.json({
        success: true,
        connected: isConnected,
        message: 'Successfully connected to Immich instance',
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to test Immich connection',
      });
    }
  }

  /**
   * Get user's Immich assets
   */
  async getAssets(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401);
      }

      // Get user's Immich settings
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { immichApiUrl: true, immichApiKey: true },
      });

      if (!user?.immichApiUrl || !user?.immichApiKey) {
        throw new AppError('Immich settings not configured', 400);
      }

      const { skip, take, isFavorite, isArchived } = req.query;

      // Build options object only if any parameters are provided
      const options: any = {};
      let hasOptions = false;

      if (skip !== undefined || take !== undefined) {
        options.skip = skip ? parseInt(skip as string) : 0;
        options.take = take ? parseInt(take as string) : 100;
        hasOptions = true;
      }
      if (isFavorite !== undefined) {
        options.isFavorite = isFavorite === 'true';
        hasOptions = true;
      }
      if (isArchived !== undefined) {
        options.isArchived = isArchived === 'true';
        hasOptions = true;
      }

      const result = await immichService.getAssets(
        user.immichApiUrl,
        user.immichApiKey,
        hasOptions ? options : undefined
      );

      // Add thumbnail and file URLs to each asset
      const assetsWithUrls = result.assets.map(asset => ({
        ...asset,
        thumbnailUrl: immichService.getAssetThumbnailUrl(
          user.immichApiUrl!,
          asset.id,
          user.immichApiKey!
        ),
        fileUrl: immichService.getAssetFileUrl(
          user.immichApiUrl!,
          asset.id,
          user.immichApiKey!
        ),
      }));

      res.json({ assets: assetsWithUrls, total: result.total });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch Immich assets',
      });
    }
  }

  /**
   * Get a single asset by ID
   */
  async getAssetById(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401);
      }

      const { assetId } = req.params;

      // Get user's Immich settings
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { immichApiUrl: true, immichApiKey: true },
      });

      if (!user?.immichApiUrl || !user?.immichApiKey) {
        throw new AppError('Immich settings not configured', 400);
      }

      const asset = await immichService.getAssetById(
        user.immichApiUrl,
        user.immichApiKey,
        assetId
      );

      // Add URLs for thumbnail and file
      const assetWithUrls = {
        ...asset,
        thumbnailUrl: immichService.getAssetThumbnailUrl(
          user.immichApiUrl,
          assetId,
          user.immichApiKey
        ),
        fileUrl: immichService.getAssetFileUrl(
          user.immichApiUrl,
          assetId,
          user.immichApiKey
        ),
      };

      res.json(assetWithUrls);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch Immich asset',
      });
    }
  }

  /**
   * Search Immich assets
   */
  async searchAssets(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401);
      }

      // Get user's Immich settings
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { immichApiUrl: true, immichApiKey: true },
      });

      if (!user?.immichApiUrl || !user?.immichApiKey) {
        throw new AppError('Immich settings not configured', 400);
      }

      const assets = await immichService.searchAssets(
        user.immichApiUrl,
        user.immichApiKey,
        req.body
      );

      // Add thumbnail and file URLs to each asset
      const assetsWithUrls = assets.map(asset => ({
        ...asset,
        thumbnailUrl: immichService.getAssetThumbnailUrl(
          user.immichApiUrl!,
          asset.id,
          user.immichApiKey!
        ),
        fileUrl: immichService.getAssetFileUrl(
          user.immichApiUrl!,
          asset.id,
          user.immichApiKey!
        ),
      }));

      res.json({ assets: assetsWithUrls });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to search Immich assets',
      });
    }
  }

  /**
   * Get user's Immich albums
   */
  async getAlbums(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401);
      }

      // Get user's Immich settings
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { immichApiUrl: true, immichApiKey: true },
      });

      if (!user?.immichApiUrl || !user?.immichApiKey) {
        throw new AppError('Immich settings not configured', 400);
      }

      const { shared } = req.query;
      const albums = await immichService.getAlbums(
        user.immichApiUrl,
        user.immichApiKey,
        shared === 'true'
      );

      res.json({ albums });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch Immich albums',
      });
    }
  }

  /**
   * Get album by ID with its assets
   */
  async getAlbumById(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401);
      }

      const { albumId } = req.params;

      // Get user's Immich settings
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { immichApiUrl: true, immichApiKey: true },
      });

      if (!user?.immichApiUrl || !user?.immichApiKey) {
        throw new AppError('Immich settings not configured', 400);
      }

      const album = await immichService.getAlbumById(
        user.immichApiUrl,
        user.immichApiKey,
        albumId
      );

      // Add thumbnail and file URLs to each asset in the album
      const albumWithUrls = {
        ...album,
        assets: album.assets.map(asset => ({
          ...asset,
          thumbnailUrl: immichService.getAssetThumbnailUrl(
            user.immichApiUrl!,
            asset.id,
            user.immichApiKey!
          ),
          fileUrl: immichService.getAssetFileUrl(
            user.immichApiUrl!,
            asset.id,
            user.immichApiKey!
          ),
        })),
      };

      res.json(albumWithUrls);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch Immich album',
      });
    }
  }

  /**
   * Get assets by date range (useful for trip dates)
   */
  async getAssetsByDateRange(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401);
      }

      const { startDate, endDate, skip, take } = req.query;

      if (!startDate || !endDate) {
        throw new AppError('Start date and end date are required', 400);
      }

      // Get user's Immich settings
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { immichApiUrl: true, immichApiKey: true },
      });

      if (!user?.immichApiUrl || !user?.immichApiKey) {
        throw new AppError('Immich settings not configured', 400);
      }

      // Only pass pagination options if they were provided in the request
      const paginationOptions = (skip !== undefined || take !== undefined) ? {
        skip: skip ? parseInt(skip as string) : 0,
        take: take ? parseInt(take as string) : 100,
      } : undefined;

      const result = await immichService.getAssetsByDateRange(
        user.immichApiUrl,
        user.immichApiKey,
        startDate as string,
        endDate as string,
        paginationOptions
      );

      // Add thumbnail and file URLs to each asset
      const assetsWithUrls = result.assets.map(asset => ({
        ...asset,
        thumbnailUrl: immichService.getAssetThumbnailUrl(
          user.immichApiUrl!,
          asset.id,
          user.immichApiKey!
        ),
        fileUrl: immichService.getAssetFileUrl(
          user.immichApiUrl!,
          asset.id,
          user.immichApiKey!
        ),
      }));

      res.json({ assets: assetsWithUrls, total: result.total });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch assets by date range',
      });
    }
  }

  /**
   * Get asset URLs (thumbnail and file)
   */
  async getAssetUrls(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401);
      }

      const { assetId } = req.params;

      // Get user's Immich settings
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { immichApiUrl: true, immichApiKey: true },
      });

      if (!user?.immichApiUrl || !user?.immichApiKey) {
        throw new AppError('Immich settings not configured', 400);
      }

      const thumbnailUrl = immichService.getAssetThumbnailUrl(
        user.immichApiUrl,
        assetId,
        user.immichApiKey
      );

      const fileUrl = immichService.getAssetFileUrl(
        user.immichApiUrl,
        assetId,
        user.immichApiKey
      );

      res.json({
        assetId,
        thumbnailUrl,
        fileUrl,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to get asset URLs',
      });
    }
  }

  /**
   * Proxy asset thumbnail from Immich
   */
  async getAssetThumbnail(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        console.log('[Thumbnail Proxy] Unauthorized - no userId');
        throw new AppError('Unauthorized', 401);
      }

      const { assetId } = req.params;
      console.log(`[Thumbnail Proxy] Request for asset: ${assetId} from user: ${userId}`);

      // Get user's Immich settings
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { immichApiUrl: true, immichApiKey: true },
      });

      if (!user?.immichApiUrl || !user?.immichApiKey) {
        console.log('[Thumbnail Proxy] Immich settings not configured for user');
        throw new AppError('Immich settings not configured', 400);
      }

      console.log(`[Thumbnail Proxy] Using Immich URL: ${user.immichApiUrl}`);
      console.log(`[Thumbnail Proxy] Fetching thumbnail stream for asset: ${assetId}`);

      // Fetch thumbnail from Immich and stream it
      const thumbnail = await immichService.getAssetThumbnailStream(
        user.immichApiUrl,
        user.immichApiKey,
        assetId
      );

      console.log(`[Thumbnail Proxy] Successfully fetched thumbnail, content-type: ${thumbnail.contentType}`);

      // Set appropriate headers
      res.setHeader('Content-Type', thumbnail.contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

      // Pipe the stream to response
      thumbnail.stream.pipe(res);

      console.log(`[Thumbnail Proxy] Stream piped to response for asset: ${assetId}`);
    } catch (error: any) {
      console.error(`[Thumbnail Proxy] Error fetching thumbnail:`, error.message);
      console.error(`[Thumbnail Proxy] Error details:`, error.response?.data || error);
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch thumbnail',
      });
    }
  }

  /**
   * Proxy asset original file from Immich
   */
  async getAssetOriginal(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401);
      }

      const { assetId } = req.params;

      // Get user's Immich settings
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { immichApiUrl: true, immichApiKey: true },
      });

      if (!user?.immichApiUrl || !user?.immichApiKey) {
        throw new AppError('Immich settings not configured', 400);
      }

      // Fetch original file from Immich and stream it
      const file = await immichService.getAssetOriginalStream(
        user.immichApiUrl,
        user.immichApiKey,
        assetId
      );

      // Set appropriate headers
      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

      // Pipe the stream to response
      file.stream.pipe(res);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch original file',
      });
    }
  }
}

export default new ImmichController();
