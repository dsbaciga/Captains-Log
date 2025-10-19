import { Router } from 'express';
import journalEntryController from '../controllers/journalEntry.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create journal entry
router.post('/', journalEntryController.createJournalEntry);

// Get journal entries by trip
router.get('/trip/:tripId', journalEntryController.getJournalEntriesByTrip);

// Get journal entry by ID
router.get('/:id', journalEntryController.getJournalEntryById);

// Update journal entry
router.put('/:id', journalEntryController.updateJournalEntry);

// Delete journal entry
router.delete('/:id', journalEntryController.deleteJournalEntry);

export default router;
