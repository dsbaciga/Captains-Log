import { Request, Response } from 'express';
import immichService from '../services/immich.service';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';
import { requireUserId } from '../utils/controllerHelpers';

// Type for getAssets query options
interface GetAssetsOptions {
  skip?: number;
  take?: number;
  isFavorite?: boolean;
  isArchived?: boolean;
}

// Type for pagination options
interface PaginationOptions {
  skip?: number;
  take?: number;
}

// Helper to get user's Immich settings
async function getUserImmichSettings(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { immichApiUrl: true, immichApiKey: true },
  });

  if (!user?.immichApiUrl || !user?.immichApiKey) {
    throw new AppError('Immich settings not configured', 400);
  }

  return { apiUrl: user.immichApiUrl, apiKey: user.immichApiKey };
}

// Helper to add thumbnail and file URLs to assets
function addAssetUrls(
  assets: Array<{ id: string }>,
  apiUrl: string,
  apiKey: string
) {
  return assets.map(asset => ({
    ...asset,
    thumbnailUrl: immichService.getAssetThumbnailUrl(apiUrl, asset.id, apiKey),
    fileUrl: immichService.getAssetFileUrl(apiUrl, asset.id, apiKey),
  }));
}

export const immichController = {
  /**
   * Test connection to user's Immich instance
   */
  testConnection: asyncHandler(async (req: Request, res: Response) => {
    requireUserId(req); // Validate authentication

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
  }),

  /**
   * Get user's Immich assets
   */
  getAssets: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { apiUrl, apiKey } = await getUserImmichSettings(userId);

    const { skip, take, isFavorite, isArchived } = req.query;

    // Build options object only if any parameters are provided
    const options: GetAssetsOptions = {};
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
      apiUrl,
      apiKey,
      hasOptions ? options : undefined
    );

    const assetsWithUrls = addAssetUrls(result.assets, apiUrl, apiKey);

    res.json({ assets: assetsWithUrls, total: result.total });
  }),

  /**
   * Get a single asset by ID
   */
  getAssetById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { assetId } = req.params;
    const { apiUrl, apiKey } = await getUserImmichSettings(userId);

    const asset = await immichService.getAssetById(apiUrl, apiKey, assetId);

    const assetWithUrls = {
      ...asset,
      thumbnailUrl: immichService.getAssetThumbnailUrl(apiUrl, assetId, apiKey),
      fileUrl: immichService.getAssetFileUrl(apiUrl, assetId, apiKey),
    };

    res.json(assetWithUrls);
  }),

  /**
   * Search Immich assets
   */
  searchAssets: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { apiUrl, apiKey } = await getUserImmichSettings(userId);

    const assets = await immichService.searchAssets(apiUrl, apiKey, req.body);

    const assetsWithUrls = addAssetUrls(assets, apiUrl, apiKey);

    res.json({ assets: assetsWithUrls });
  }),

  /**
   * Get user's Immich albums
   */
  getAlbums: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { apiUrl, apiKey } = await getUserImmichSettings(userId);

    const { shared } = req.query;
    const albums = await immichService.getAlbums(apiUrl, apiKey, shared === 'true');

    res.json({ albums });
  }),

  /**
   * Get album by ID with its assets
   */
  getAlbumById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { albumId } = req.params;
    const { apiUrl, apiKey } = await getUserImmichSettings(userId);

    const album = await immichService.getAlbumById(apiUrl, apiKey, albumId);

    const albumWithUrls = {
      ...album,
      assets: addAssetUrls(album.assets, apiUrl, apiKey),
    };

    res.json(albumWithUrls);
  }),

  /**
   * Get assets by date range (useful for trip dates)
   */
  getAssetsByDateRange: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { startDate, endDate, skip, take } = req.query;

    if (!startDate || !endDate) {
      throw new AppError('Start date and end date are required', 400);
    }

    const { apiUrl, apiKey } = await getUserImmichSettings(userId);

    // Only pass pagination options if they were provided in the request
    const paginationOptions: PaginationOptions | undefined =
      skip !== undefined || take !== undefined
        ? {
            skip: skip ? parseInt(skip as string) : 0,
            take: take ? parseInt(take as string) : 100,
          }
        : undefined;

    const result = await immichService.getAssetsByDateRange(
      apiUrl,
      apiKey,
      startDate as string,
      endDate as string,
      paginationOptions
    );

    const assetsWithUrls = addAssetUrls(result.assets, apiUrl, apiKey);

    res.json({ assets: assetsWithUrls, total: result.total });
  }),

  /**
   * Get asset URLs (thumbnail and file)
   */
  getAssetUrls: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { assetId } = req.params;
    const { apiUrl, apiKey } = await getUserImmichSettings(userId);

    const thumbnailUrl = immichService.getAssetThumbnailUrl(apiUrl, assetId, apiKey);
    const fileUrl = immichService.getAssetFileUrl(apiUrl, assetId, apiKey);

    res.json({
      assetId,
      thumbnailUrl,
      fileUrl,
    });
  }),

  /**
   * Proxy asset thumbnail from Immich
   */
  getAssetThumbnail: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { assetId } = req.params;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Thumbnail Proxy] Request for asset: ${assetId} from user: ${userId}`);
    }

    const { apiUrl, apiKey } = await getUserImmichSettings(userId);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Thumbnail Proxy] Fetching thumbnail stream for asset: ${assetId}`);
    }

    const thumbnail = await immichService.getAssetThumbnailStream(apiUrl, apiKey, assetId);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Thumbnail Proxy] Successfully fetched thumbnail, content-type: ${thumbnail.contentType}`);
    }

    res.setHeader('Content-Type', thumbnail.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    thumbnail.stream.pipe(res);
  }),

  /**
   * Proxy asset original file from Immich
   */
  getAssetOriginal: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { assetId } = req.params;
    const { apiUrl, apiKey } = await getUserImmichSettings(userId);

    const file = await immichService.getAssetOriginalStream(apiUrl, apiKey, assetId);

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    file.stream.pipe(res);
  }),
};
