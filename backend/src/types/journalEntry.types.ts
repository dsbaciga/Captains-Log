import { z } from 'zod';

export interface JournalEntry {
  id: number;
  tripId: number;
  locationId: number | null;
  title: string;
  content: string;
  entryDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntryWithLocation extends JournalEntry {
  location?: {
    id: number;
    name: string;
  };
}

// Validation schemas
export const createJournalEntrySchema = z.object({
  tripId: z.number(),
  locationId: z.number().optional(),
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  entryDate: z.string().datetime().optional(),
});

export const updateJournalEntrySchema = z.object({
  locationId: z.number().optional().nullable(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  entryDate: z.string().datetime().optional(),
});

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;
