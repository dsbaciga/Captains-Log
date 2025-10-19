import { Router } from 'express';
import tripController from '../controllers/trip.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All trip routes require authentication
router.use(authenticate);

// Trip CRUD routes
router.post('/', tripController.createTrip);
router.get('/', tripController.getTrips);
router.get('/:id', tripController.getTripById);
router.put('/:id', tripController.updateTrip);
router.delete('/:id', tripController.deleteTrip);

// Cover photo route
router.put('/:id/cover-photo', tripController.updateCoverPhoto);

export default router;
