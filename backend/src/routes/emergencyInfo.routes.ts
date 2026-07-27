import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { emergencyInfoController } from '../controllers/emergencyInfo.controller';

// mergeParams to access :tripId from the parent mount path
const router = Router({ mergeParams: true });

router.use(authenticate);

/**
 * @openapi
 * /api/trips/{tripId}/emergency-info:
 *   get:
 *     summary: Get the emergency card payload for a trip
 *     description: >
 *       Returns the traveller-entered insurance and embassy details, the trip's
 *       companions (with medical notes and allergies when the requester owns the
 *       trip), and the raw location addresses the client uses to resolve which
 *       country's emergency numbers to show. Local emergency numbers themselves
 *       are not returned — they come from a dataset bundled with the client so
 *       the card renders offline.
 *     tags: [Emergency]
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
 *         description: The emergency card payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Trip not found
 *   put:
 *     summary: Create or update the trip's emergency details
 *     description: >
 *       Upserts the trip's single emergency record. An omitted field is left
 *       unchanged; an explicit null clears it.
 *     tags: [Emergency]
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
 *             properties:
 *               insuranceProvider:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 255
 *               insurancePolicyNumber:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 100
 *               insuranceAssistancePhone:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 50
 *               embassyName:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 255
 *               embassyPhone:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 50
 *               embassyAddress:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 1000
 *               notes:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 2000
 *     responses:
 *       200:
 *         description: The stored emergency record
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Trip not found
 *   delete:
 *     summary: Clear the trip's emergency details
 *     description: Idempotent — clearing a trip that has no record succeeds.
 *     tags: [Emergency]
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
 *         description: Emergency details cleared
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Trip not found
 */
router.get('/', emergencyInfoController.getEmergencyCard);
router.put('/', emergencyInfoController.upsertEmergencyInfo);
router.delete('/', emergencyInfoController.deleteEmergencyInfo);

export default router;
