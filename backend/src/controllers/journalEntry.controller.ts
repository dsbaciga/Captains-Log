import { Request, Response } from 'express';
import journalEntryService from '../services/journalEntry.service';
import {
  createJournalEntrySchema,
  updateJournalEntrySchema,
} from '../types/journalEntry.types';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { requireUserId } from '../utils/controllerHelpers';

export const journalEntryController = {
  createJournalEntry: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const data = createJournalEntrySchema.parse(req.body);
    const entry = await journalEntryService.createJournalEntry(userId, data);
    res.status(201).json({
      status: 'success',
      data: entry,
    });
  }),

  getJournalEntriesByTrip: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const entries = await journalEntryService.getJournalEntriesByTrip(userId, tripId);
    res.json({
      status: 'success',
      data: entries,
    });
  }),

  getJournalEntryById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const entryId = parseId(req.params.id);
    const entry = await journalEntryService.getJournalEntryById(userId, entryId);
    res.json({
      status: 'success',
      data: entry,
    });
  }),

  updateJournalEntry: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const entryId = parseId(req.params.id);
    const data = updateJournalEntrySchema.parse(req.body);
    const entry = await journalEntryService.updateJournalEntry(userId, entryId, data);
    res.json({
      status: 'success',
      data: entry,
    });
  }),

  deleteJournalEntry: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const entryId = parseId(req.params.id);
    const result = await journalEntryService.deleteJournalEntry(userId, entryId);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),
};
