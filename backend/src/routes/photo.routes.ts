import { Router } from 'express';
import multer from 'multer';
import photoController from '../controllers/photo.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Configure multer for memory storage (files will be processed before saving)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// All routes require authentication
router.use(authenticate);

// Upload photo
router.post('/upload', upload.single('photo'), photoController.uploadPhoto);

// Link Immich photo
router.post('/immich', photoController.linkImmichPhoto);

// Get photos by trip
router.get('/trip/:tripId', photoController.getPhotosByTrip);

// Get unsorted photos by trip (photos not in any album)
router.get('/trip/:tripId/unsorted', photoController.getUnsortedPhotosByTrip);

// Get photos by location
router.get('/location/:locationId', photoController.getPhotosByLocation);

// Get photo by ID
router.get('/:id', photoController.getPhotoById);

// Update photo
router.put('/:id', photoController.updatePhoto);

// Delete photo
router.delete('/:id', photoController.deletePhoto);

export default router;
