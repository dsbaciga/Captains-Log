import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { companionController } from '../controllers/companion.controller';

const router = Router();

// Multer configuration for avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max for avatars
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// All routes require authentication
router.use(authenticate);

// Companion management
router.post('/', companionController.createCompanion);
router.get('/', companionController.getCompanionsByUser);
router.get('/:id', companionController.getCompanionById);
router.put('/:id', companionController.updateCompanion);
router.delete('/:id', companionController.deleteCompanion);

// Avatar management
router.post('/:id/avatar', upload.single('avatar'), companionController.uploadAvatar);
router.post('/:id/avatar/immich', companionController.setImmichAvatar);
router.delete('/:id/avatar', companionController.deleteAvatar);

// Link/unlink companions to trips
router.post('/link', companionController.linkCompanionToTrip);
router.delete('/trips/:tripId/companions/:companionId', companionController.unlinkCompanionFromTrip);
router.get('/trips/:tripId', companionController.getCompanionsByTrip);

export default router;
