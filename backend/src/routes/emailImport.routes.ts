import { Router } from 'express';
import { emailImportController } from '../controllers/emailImport.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', emailImportController.getEmailImports);
router.get('/status', emailImportController.getStatus);
router.get('/pending', emailImportController.getPendingEntities);
router.get('/pending/count', emailImportController.getPendingCount);
router.post('/pending/:id/accept', emailImportController.acceptPendingEntity);
router.post('/pending/:id/reject', emailImportController.rejectPendingEntity);
router.put('/pending/:id', emailImportController.updatePendingEntity);
router.post('/trigger', emailImportController.triggerPoll);

export default router;
