import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticate);

// Trip-scoped AI routes — mounted at /api/trips/:tripId/ai
router.get('/link-suggestions', aiController.getLinkSuggestions);
router.post('/journal-summary', aiController.generateJournalSummary);

export default router;
