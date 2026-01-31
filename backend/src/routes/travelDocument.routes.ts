import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { travelDocumentController } from '../controllers/travelDocument.controller';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/travel-documents:
 *   get:
 *     summary: Get all travel documents for the authenticated user
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of travel documents
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Create a new travel document
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, issuingCountry, name]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [PASSPORT, VISA, ID_CARD, GLOBAL_ENTRY, VACCINATION]
 *               issuingCountry:
 *                 type: string
 *                 maxLength: 100
 *               documentNumber:
 *                 type: string
 *                 maxLength: 255
 *                 description: Optional - stored securely, only last 4 chars shown
 *               issueDate:
 *                 type: string
 *                 format: date
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               name:
 *                 type: string
 *                 maxLength: 500
 *               notes:
 *                 type: string
 *               isPrimary:
 *                 type: boolean
 *                 default: false
 *               alertDaysBefore:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 365
 *                 default: 180
 *     responses:
 *       201:
 *         description: Travel document created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/', travelDocumentController.getAll);
router.post('/', travelDocumentController.create);

/**
 * @openapi
 * /api/travel-documents/alerts:
 *   get:
 *     summary: Get documents requiring attention (expiring within alert window)
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of document alerts
 *       401:
 *         description: Unauthorized
 */
router.get('/alerts', travelDocumentController.getAlerts);

/**
 * @openapi
 * /api/travel-documents/primary-passport:
 *   get:
 *     summary: Get user's primary passport
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Primary passport or null if none exists
 *       401:
 *         description: Unauthorized
 */
router.get('/primary-passport', travelDocumentController.getPrimaryPassport);

/**
 * @openapi
 * /api/travel-documents/trip/{tripId}/check:
 *   get:
 *     summary: Check document validity for a specific trip
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The trip ID to check documents against
 *     responses:
 *       200:
 *         description: Document validity check results
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.get('/trip/:tripId/check', travelDocumentController.checkForTrip);

/**
 * @openapi
 * /api/travel-documents/{id}:
 *   get:
 *     summary: Get a travel document by ID
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The travel document ID
 *     responses:
 *       200:
 *         description: Travel document details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Travel document not found
 *   put:
 *     summary: Update a travel document
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The travel document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [PASSPORT, VISA, ID_CARD, GLOBAL_ENTRY, VACCINATION]
 *               issuingCountry:
 *                 type: string
 *                 maxLength: 100
 *               documentNumber:
 *                 type: string
 *                 maxLength: 255
 *               issueDate:
 *                 type: string
 *                 format: date
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               name:
 *                 type: string
 *                 maxLength: 500
 *               notes:
 *                 type: string
 *               isPrimary:
 *                 type: boolean
 *               alertDaysBefore:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 365
 *     responses:
 *       200:
 *         description: Travel document updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Travel document not found
 *   delete:
 *     summary: Delete a travel document
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The travel document ID
 *     responses:
 *       204:
 *         description: Travel document deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Travel document not found
 */
router.get('/:id', travelDocumentController.getById);
router.put('/:id', travelDocumentController.update);
router.delete('/:id', travelDocumentController.delete);

export default router;
