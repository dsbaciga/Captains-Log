import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { tagController } from '../controllers/tag.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Tag management
router.post('/', tagController.createTag);
router.get('/', tagController.getTagsByUser);
router.get('/:id', tagController.getTagById);
router.put('/:id', tagController.updateTag);
router.delete('/:id', tagController.deleteTag);

// Link/unlink tags to trips
router.post('/link', tagController.linkTagToTrip);
router.delete('/trips/:tripId/tags/:tagId', tagController.unlinkTagFromTrip);
router.get('/trips/:tripId', tagController.getTagsByTrip);

export default router;
