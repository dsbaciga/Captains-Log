import { Router } from 'express';
import { photoAlbumController } from '../controllers/photoAlbum.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all albums across all trips (must be before /:id route)
router.get('/', photoAlbumController.getAllAlbums);

// Create album
router.post('/', photoAlbumController.createAlbum);

// Get albums by trip
router.get('/trip/:tripId', photoAlbumController.getAlbumsByTrip);

// Get album by ID
router.get('/:id', photoAlbumController.getAlbumById);

// Update album
router.put('/:id', photoAlbumController.updateAlbum);

// Delete album
router.delete('/:id', photoAlbumController.deleteAlbum);

// Add photos to album
router.post('/:id/photos', photoAlbumController.addPhotosToAlbum);

// Remove photo from album
router.delete('/:id/photos/:photoId', photoAlbumController.removePhotoFromAlbum);

export default router;
