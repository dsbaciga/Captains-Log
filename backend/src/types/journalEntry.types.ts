import { z } from 'zod';
import {
  optionalNullable,
  requiredStringWithMax,
  optionalDatetime,
  optionalStringWithMax,
  optionalNotes,
} from '../validation/zodHelpers';

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
  title: requiredStringWithMax(500),
  content: z.string().min(1),
  entryDate: z.string().optional(),
  // Alias for entryDate: the response shape uses `date`, so accept it as an
  // input alias too and allow round-tripping without breaking entryDate callers.
  date: z.string().optional(),
  entryType: z.string().optional(), // Optional, defaults to 'daily' in service
  mood: z.string().max(50).optional(),
  weatherNotes: z.string().optional(),
});

export const updateJournalEntrySchema = z.object({
  title: optionalNullable(requiredStringWithMax(500)),
  content: z.string().min(1).optional(),
  entryDate: optionalDatetime(),
  // Alias for entryDate (see createJournalEntrySchema)
  date: optionalDatetime(),
  mood: optionalStringWithMax(50),
  weatherNotes: optionalNotes(),
});

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;
