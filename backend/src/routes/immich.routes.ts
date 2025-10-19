import { Router } from 'express';
import immichController from '../controllers/immich.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All Immich routes require authentication
router.use(authenticate);

// Test connection to Immich instance
router.post('/test', immichController.testConnection);

// Get user's assets from Immich
router.get('/assets', immichController.getAssets);

// Get assets by date range (useful for trip dates) - MUST be before :assetId route
router.get('/assets/date-range', immichController.getAssetsByDateRange);

// Get asset thumbnail (proxy) - MUST be before :assetId route
router.get('/assets/:assetId/thumbnail', immichController.getAssetThumbnail);

// Get asset original file (proxy) - MUST be before :assetId route
router.get('/assets/:assetId/original', immichController.getAssetOriginal);

// Get a single asset by ID
router.get('/assets/:assetId', immichController.getAssetById);

// Get asset URLs (thumbnail and file)
router.get('/assets/:assetId/urls', immichController.getAssetUrls);

// Search assets by metadata
router.post('/search', immichController.searchAssets);

// Get user's albums
router.get('/albums', immichController.getAlbums);

// Get album by ID with its assets
router.get('/albums/:albumId', immichController.getAlbumById);

export default router;
