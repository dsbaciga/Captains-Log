/**
 * JournalEntry represents a journal entry for a trip.
 *
 * Links to other entities (activities, lodging, transportation, locations) live
 * in the unified EntityLink system — the old journal_* assignment tables were
 * dropped in migration 20260118_remove_old_journal_linkage_tables — so query
 * `entityLinkService.getTripLinkSummary()` rather than expecting them here.
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
