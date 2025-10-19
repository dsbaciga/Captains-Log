import { Router } from 'express';
import locationController from '../controllers/location.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All location routes require authentication
router.use(authenticate);

// Location CRUD routes
router.post('/', locationController.createLocation);
router.get('/visited', locationController.getAllVisitedLocations);
router.get('/trip/:tripId', locationController.getLocationsByTrip);
router.get('/:id', locationController.getLocationById);
router.put('/:id', locationController.updateLocation);
router.delete('/:id', locationController.deleteLocation);

// Location category routes
router.get('/categories/list', locationController.getCategories);
router.post('/categories', locationController.createCategory);
router.put('/categories/:id', locationController.updateCategory);
router.delete('/categories/:id', locationController.deleteCategory);

export default router;
