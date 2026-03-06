import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { appSettingsController } from '../controllers/appSettings.controller';

const router = Router();

router.use(authenticate);

router.get('/email-import', appSettingsController.getEmailImportSettings);
router.put('/email-import', appSettingsController.updateEmailImportSettings);
router.post('/email-import/test-llm', appSettingsController.testLlmConnection);

export default router;
