import { z } from 'zod';

export interface JournalEntry {
  id: number;
  tripId: number;
  date: Date | null;
  title: string | null;
  content: string;
  entryType: string;
  mood: string | null;
  weatherNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Validation schemas
export const createJournalEntrySchema = z.object({
  tripId: z.number(),
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  entryDate: z.string().optional(),
  entryType: z.string().optional(), // Optional, defaults to 'daily' in service
});

export const updateJournalEntrySchema = z.object({
  title: z.string().min(1).max(500).optional().nullable(),
  content: z.string().min(1).optional(),
  entryDate: z.string().optional().nullable(),
});

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;
