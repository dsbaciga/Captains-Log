import express from 'express';
import checklistController from '../controllers/checklist.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Checklist routes
router.get('/', checklistController.getChecklists);
router.get('/:id', checklistController.getChecklistById);
router.post('/', checklistController.createChecklist);
router.put('/:id', checklistController.updateChecklist);
router.delete('/:id', checklistController.deleteChecklist);

// Checklist item routes
router.post('/:id/items', checklistController.addChecklistItem);
router.put('/items/:itemId', checklistController.updateChecklistItem);
router.delete('/items/:itemId', checklistController.deleteChecklistItem);

// Special routes
router.post('/initialize', checklistController.initializeDefaults);
router.post('/auto-check', checklistController.autoCheckFromTrips);
router.delete('/defaults', checklistController.removeDefaults);
router.post('/defaults/restore', checklistController.restoreDefaults);

// Selective default checklist management
router.get('/defaults/status', checklistController.getDefaultsStatus);
router.post('/defaults/add', checklistController.addDefaults);
router.post('/defaults/remove', checklistController.removeDefaultsByType);

export default router;
