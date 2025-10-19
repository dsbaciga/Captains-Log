import { Router } from 'express';
import lodgingController from '../controllers/lodging.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create lodging
router.post('/', lodgingController.createLodging);

// Get lodging by trip
router.get('/trip/:tripId', lodgingController.getLodgingByTrip);

// Get lodging by ID
router.get('/:id', lodgingController.getLodgingById);

// Update lodging
router.put('/:id', lodgingController.updateLodging);

// Delete lodging
router.delete('/:id', lodgingController.deleteLodging);

export default router;
