import express from 'express';
import { checklistController } from '../controllers/checklist.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// IMPORTANT: Specific routes MUST come before wildcard /:id routes
// Otherwise Express will match /:id first and "defaults" becomes the id

// Special routes (must be before /:id)
router.post('/initialize', checklistController.initializeDefaults);
router.post('/auto-check', checklistController.autoCheckFromTrips);
router.delete('/defaults', checklistController.removeDefaults);
router.post('/defaults/restore', checklistController.restoreDefaults);
router.get('/defaults/status', checklistController.getDefaultsStatus);
router.post('/defaults/add', checklistController.addDefaults);
router.post('/defaults/remove', checklistController.removeDefaultsByType);

// Checklist item routes (specific paths before wildcards)
router.put('/items/:itemId', checklistController.updateChecklistItem);
router.delete('/items/:itemId', checklistController.deleteChecklistItem);

// Checklist CRUD routes (wildcards last)
router.get('/', checklistController.getChecklists);
router.post('/', checklistController.createChecklist);
router.get('/:id', checklistController.getChecklistById);
router.put('/:id', checklistController.updateChecklist);
router.delete('/:id', checklistController.deleteChecklist);
router.post('/:id/items', checklistController.addChecklistItem);

export default router;
