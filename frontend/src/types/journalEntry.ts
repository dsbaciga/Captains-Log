/**
 * Location reference within a journal entry assignment.
 * Contains minimal location information for display purposes.
 */
export interface JournalLocationRef {
  location?: {
    name?: string;
  };
}

/**
 * JournalEntry represents a journal entry for a trip.
 *
 * The assignment properties (activityAssignments, lodgingAssignments, etc.)
 * are optional arrays that may be present when journal entries are linked
 * to other entities. Currently these are not populated by the backend but
 * are included for type safety when checking if entries are "standalone"
 * (not linked to activities, lodging, or transportation).
 */
export type JournalEntry = {
  id: number;
  tripId: number;
  date: string | null;
  title: string | null;
  content: string;
  entryType: string;
  mood: string | null;
  weatherNotes: string | null;
  createdAt: string;
  updatedAt: string;

  // Optional assignment arrays - may be present when entries are linked to other entities
  // These are used to determine if a journal entry is "standalone" or linked
  activityAssignments?: unknown[];
  lodgingAssignments?: unknown[];
  transportationAssignments?: unknown[];
  locationAssignments?: JournalLocationRef[];
};

export type CreateJournalEntryInput = {
  tripId: number;
  title: string;
  content: string;
  entryDate?: string;
  entryType?: string;
};

export type UpdateJournalEntryInput = {
  title?: string | null;
  content?: string;
  entryDate?: string | null;
};
