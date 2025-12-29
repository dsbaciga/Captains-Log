import { Router } from 'express';
import transportationController from '../controllers/transportation.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create transportation
router.post('/', transportationController.createTransportation);

// Get transportation by trip
router.get('/trip/:tripId', transportationController.getTransportationByTrip);

// Recalculate route distances for all transportation in a trip
router.post('/trip/:tripId/recalculate-distances', transportationController.recalculateDistances);

// Get transportation by ID
router.get('/:id', transportationController.getTransportationById);

// Update transportation
router.put('/:id', transportationController.updateTransportation);

// Delete transportation
router.delete('/:id', transportationController.deleteTransportation);

export default router;
