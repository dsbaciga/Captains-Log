import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { userController } from '../controllers/user.controller';

const router = Router();

router.use(authenticate);

router.get('/me', userController.getMe);
router.put('/settings', userController.updateSettings);

// Immich settings
router.get('/immich-settings', userController.getImmichSettings);
router.put('/immich-settings', userController.updateImmichSettings);

// Weather settings
router.get('/weather-settings', userController.getWeatherSettings);
router.put('/weather-settings', userController.updateWeatherSettings);

// Profile updates
router.put('/username', userController.updateUsername);
router.put('/password', userController.updatePassword);

export default router;
