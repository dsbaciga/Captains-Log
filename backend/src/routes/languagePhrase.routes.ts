import express from 'express';
import { languagePhraseController } from '../controllers/languagePhrase.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// =============================================================================
// PUBLIC ROUTES (no authentication required)
// =============================================================================
// These routes provide access to the static phrase data

/**
 * @openapi
 * /api/languages:
 *   get:
 *     summary: Get all available languages
 *     description: Returns a list of all languages with phrase support, including phrase counts
 *     tags: [Language Phrases]
 *     responses:
 *       200:
 *         description: List of available languages
 */
router.get('/languages', languagePhraseController.getAvailableLanguages);

/**
 * @openapi
 * /api/phrases/categories:
 *   get:
 *     summary: Get all phrase categories
 *     description: Returns the list of phrase categories (greetings, dining, etc.)
 *     tags: [Language Phrases]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/phrases/categories', languagePhraseController.getCategories);

/**
 * @openapi
 * /api/phrases/{languageCode}:
 *   get:
 *     summary: Get phrases for a specific language
 *     description: Returns all phrases for the specified language code
 *     tags: [Language Phrases]
 *     parameters:
 *       - in: path
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *         description: ISO 639-1 language code (e.g., 'ja', 'fr', 'es')
 *     responses:
 *       200:
 *         description: Language with all phrases
 *       400:
 *         description: Invalid language code
 *       404:
 *         description: Language not found
 */
router.get('/phrases/:languageCode', languagePhraseController.getPhrasesByLanguage);

/**
 * @openapi
 * /api/phrases/{languageCode}/category/{category}:
 *   get:
 *     summary: Get phrases for a specific language and category
 *     description: Returns phrases for the specified language filtered by category
 *     tags: [Language Phrases]
 *     parameters:
 *       - in: path
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *         description: ISO 639-1 language code
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [greetings, dining, directions, emergency, shopping, courtesy]
 *         description: Phrase category
 *     responses:
 *       200:
 *         description: Language with filtered phrases
 *       404:
 *         description: Language not found
 */
router.get('/phrases/:languageCode/category/:category', languagePhraseController.getPhrasesByCategory);

// =============================================================================
// PROTECTED ROUTES (authentication required)
// =============================================================================
// These routes manage trip-specific language selections

/**
 * @openapi
 * /api/trips/{tripId}/languages:
 *   get:
 *     summary: Get languages selected for a trip
 *     description: Returns all languages that have been added to the specified trip
 *     tags: [Language Phrases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The trip ID
 *     responses:
 *       200:
 *         description: List of trip languages
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 *   post:
 *     summary: Add a language to a trip
 *     description: Adds a language to the trip for phrase bank access
 *     tags: [Language Phrases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The trip ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [languageCode, languageName]
 *             properties:
 *               languageCode:
 *                 type: string
 *                 description: ISO 639-1 language code
 *               languageName:
 *                 type: string
 *                 description: Display name of the language
 *     responses:
 *       201:
 *         description: Language added to trip
 *       400:
 *         description: Language already added or invalid data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.get('/trips/:tripId/languages', authenticate, languagePhraseController.getTripLanguages);
router.post('/trips/:tripId/languages', authenticate, languagePhraseController.addTripLanguage);

/**
 * @openapi
 * /api/trips/{tripId}/languages/{languageCode}:
 *   delete:
 *     summary: Remove a language from a trip
 *     description: Removes a language from the trip's phrase bank selection
 *     tags: [Language Phrases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The trip ID
 *       - in: path
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *         description: ISO 639-1 language code to remove
 *     responses:
 *       200:
 *         description: Language removed from trip
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip or language not found
 */
router.delete('/trips/:tripId/languages/:languageCode', authenticate, languagePhraseController.removeTripLanguage);

/**
 * @openapi
 * /api/trips/{tripId}/phrases:
 *   get:
 *     summary: Get phrases for all languages selected for a trip
 *     description: Returns phrases for all languages that have been added to the trip
 *     tags: [Language Phrases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The trip ID
 *     responses:
 *       200:
 *         description: All phrases for trip languages
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.get('/trips/:tripId/phrases', authenticate, languagePhraseController.getTripPhrases);

export default router;
