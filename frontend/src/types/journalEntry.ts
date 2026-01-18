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
