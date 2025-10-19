import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { activityController } from '../controllers/activity.controller';

const router = Router();

router.use(authenticate);

router.post('/', activityController.createActivity);
router.get('/trip/:tripId', activityController.getActivitiesByTrip);
router.get('/:id', activityController.getActivityById);
router.put('/:id', activityController.updateActivity);
router.delete('/:id', activityController.deleteActivity);

export default router;
