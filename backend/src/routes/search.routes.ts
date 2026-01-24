import { Router } from 'express';
import { searchController } from '../controllers/search.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All search routes require authentication
router.use(authenticate);

router.get('/', searchController.globalSearch);

export default router;

