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

export interface JournalEntryWithAssociations extends JournalEntry {
  locationAssignments?: Array<{
    id: number;
    location: {
      id: number;
      name: string;
    };
  }>;
  activityAssignments?: Array<{
    id: number;
    activity: {
      id: number;
      name: string;
    };
  }>;
  lodgingAssignments?: Array<{
    id: number;
    lodging: {
      id: number;
      name: string;
    };
  }>;
  transportationAssignments?: Array<{
    id: number;
    transportation: {
      id: number;
      type: string;
    };
  }>;
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
  entryType: z.string().optional(), // Optional, defaults to 'daily' in service
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
