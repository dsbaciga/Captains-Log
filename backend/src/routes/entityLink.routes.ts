import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { entityLinkController } from '../controllers/entityLink.controller';

const router = Router({ mergeParams: true }); // mergeParams to access :tripId from parent

// All routes require authentication
router.use(authenticate);

// Create links
router.post('/', entityLinkController.createLink);
router.post('/bulk', entityLinkController.bulkCreateLinks);
router.post('/photos', entityLinkController.bulkLinkPhotos);

// Query links
router.get('/summary', entityLinkController.getTripLinkSummary);
router.get('/from/:entityType/:entityId', entityLinkController.getLinksFrom);
router.get('/to/:entityType/:entityId', entityLinkController.getLinksTo);
router.get('/entity/:entityType/:entityId', entityLinkController.getAllLinksForEntity);
router.get('/photos/:entityType/:entityId', entityLinkController.getPhotosForEntity);

// Delete links
router.delete('/', entityLinkController.deleteLink);
router.delete('/:linkId', entityLinkController.deleteLinkById);
router.delete('/entity/:entityType/:entityId', entityLinkController.deleteAllLinksForEntity);

export default router;
