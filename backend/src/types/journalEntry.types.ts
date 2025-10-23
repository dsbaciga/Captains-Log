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
  locationIds: z.array(z.number()).optional(),
  activityIds: z.array(z.number()).optional(),
  lodgingIds: z.array(z.number()).optional(),
  transportationIds: z.array(z.number()).optional(),
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  entryDate: z.string().optional(),
});

export const updateJournalEntrySchema = z.object({
  locationIds: z.array(z.number()).optional(),
  activityIds: z.array(z.number()).optional(),
  lodgingIds: z.array(z.number()).optional(),
  transportationIds: z.array(z.number()).optional(),
  title: z.string().min(1).max(500).optional().nullable(),
  content: z.string().min(1).optional(),
  entryDate: z.string().optional().nullable(),
});

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;
