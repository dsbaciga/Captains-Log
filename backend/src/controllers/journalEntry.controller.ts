import { Request, Response, NextFunction } from 'express';
import journalEntryService from '../services/journalEntry.service';
import {
  createJournalEntrySchema,
  updateJournalEntrySchema,
} from '../types/journalEntry.types';

class JournalEntryController {
  async createJournalEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createJournalEntrySchema.parse(req.body);
      const entry = await journalEntryService.createJournalEntry(
        req.user!.userId,
        validatedData
      );

      res.status(201).json(entry);
    } catch (error) {
      next(error);
    }
  }

  async getJournalEntriesByTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const tripId = parseInt(req.params.tripId);
      const entries = await journalEntryService.getJournalEntriesByTrip(
        req.user!.userId,
        tripId
      );

      res.json(entries);
    } catch (error) {
      next(error);
    }
  }

  async getJournalEntryById(req: Request, res: Response, next: NextFunction) {
    try {
      const entryId = parseInt(req.params.id);
      const entry = await journalEntryService.getJournalEntryById(
        req.user!.userId,
        entryId
      );

      res.json(entry);
    } catch (error) {
      next(error);
    }
  }

  async updateJournalEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const entryId = parseInt(req.params.id);
      const validatedData = updateJournalEntrySchema.parse(req.body);
      const entry = await journalEntryService.updateJournalEntry(
        req.user!.userId,
        entryId,
        validatedData
      );

      res.json(entry);
    } catch (error) {
      next(error);
    }
  }

  async deleteJournalEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const entryId = parseInt(req.params.id);
      await journalEntryService.deleteJournalEntry(req.user!.userId, entryId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export default new JournalEntryController();
