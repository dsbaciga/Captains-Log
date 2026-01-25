import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { userController } from '../controllers/user.controller';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *       401:
 *         description: Unauthorized
 */
router.get('/me', userController.getMe);

/**
 * @openapi
 * /api/users/settings:
 *   put:
 *     summary: Update user settings
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               homeTimezone:
 *                 type: string
 *                 description: User's home timezone (e.g., America/New_York)
 *               theme:
 *                 type: string
 *                 enum: [light, dark, system]
 *               defaultCurrency:
 *                 type: string
 *                 description: Default currency code (e.g., USD)
 *               locationCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Custom location categories
 *               activityCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Custom activity categories
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/settings', userController.updateSettings);

/**
 * @openapi
 * /api/users/immich-settings:
 *   get:
 *     summary: Get Immich integration settings
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Immich settings (URL and whether API key is set)
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update Immich integration settings
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               immichUrl:
 *                 type: string
 *                 format: uri
 *                 description: Immich server URL
 *               immichApiKey:
 *                 type: string
 *                 description: Immich API key
 *     responses:
 *       200:
 *         description: Immich settings updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/immich-settings', userController.getImmichSettings);
router.put('/immich-settings', userController.updateImmichSettings);

/**
 * @openapi
 * /api/users/weather-settings:
 *   get:
 *     summary: Get weather integration settings
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weather settings (whether API key is set)
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update weather integration settings
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               openWeatherMapApiKey:
 *                 type: string
 *                 description: OpenWeatherMap API key
 *     responses:
 *       200:
 *         description: Weather settings updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/weather-settings', userController.getWeatherSettings);
router.put('/weather-settings', userController.updateWeatherSettings);

/**
 * @openapi
 * /api/users/aviationstack-settings:
 *   get:
 *     summary: Get AviationStack integration settings
 *     description: Settings for flight tracking via AviationStack API
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AviationStack settings (whether API key is set)
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update AviationStack integration settings
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               aviationstackApiKey:
 *                 type: string
 *                 description: AviationStack API key
 *     responses:
 *       200:
 *         description: AviationStack settings updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/aviationstack-settings', userController.getAviationstackSettings);
router.put('/aviationstack-settings', userController.updateAviationstackSettings);

/**
 * @openapi
 * /api/users/openrouteservice-settings:
 *   get:
 *     summary: Get OpenRouteService integration settings
 *     description: Settings for route distance calculations
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OpenRouteService settings (whether API key is set)
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update OpenRouteService integration settings
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               openrouteserviceApiKey:
 *                 type: string
 *                 description: OpenRouteService API key
 *     responses:
 *       200:
 *         description: OpenRouteService settings updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/openrouteservice-settings', userController.getOpenrouteserviceSettings);
router.put('/openrouteservice-settings', userController.updateOpenrouteserviceSettings);

/**
 * @openapi
 * /api/users/username:
 *   put:
 *     summary: Update username
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *     responses:
 *       200:
 *         description: Username updated successfully
 *       400:
 *         description: Validation error or username taken
 *       401:
 *         description: Unauthorized
 */
router.put('/username', userController.updateUsername);

/**
 * @openapi
 * /api/users/password:
 *   put:
 *     summary: Update password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password for verification
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (minimum 8 characters)
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Current password incorrect
 */
router.put('/password', userController.updatePassword);

export default router;
