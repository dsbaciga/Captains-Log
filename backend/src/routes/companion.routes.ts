import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { companionController } from '../controllers/companion.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Companion management
router.post('/', companionController.createCompanion);
router.get('/', companionController.getCompanionsByUser);
router.get('/:id', companionController.getCompanionById);
router.put('/:id', companionController.updateCompanion);
router.delete('/:id', companionController.deleteCompanion);

// Link/unlink companions to trips
router.post('/link', companionController.linkCompanionToTrip);
router.delete('/trips/:tripId/companions/:companionId', companionController.unlinkCompanionFromTrip);
router.get('/trips/:tripId', companionController.getCompanionsByTrip);

export default router;
