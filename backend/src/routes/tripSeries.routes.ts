import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { tripSeriesController } from '../controllers/tripSeries.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// CRUD routes
router.get('/', tripSeriesController.getAll);
router.post('/', tripSeriesController.create);
router.get('/:id', tripSeriesController.getById);
router.put('/:id', tripSeriesController.update);
router.delete('/:id', tripSeriesController.delete);

// Trip management within a series
router.post('/:id/trips', tripSeriesController.addTrip);
router.delete('/:id/trips/:tripId', tripSeriesController.removeTrip);
router.put('/:id/reorder', tripSeriesController.reorderTrips);

export default router;
