export type JournalEntry = {
  id: number;
  tripId: number;
  locationId: number | null;
  title: string;
  content: string;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
  location?: {
    id: number;
    name: string;
  };
};

export type CreateJournalEntryInput = {
  tripId: number;
  locationId?: number;
  title: string;
  content: string;
  entryDate?: string;
};

export type UpdateJournalEntryInput = {
  locationId?: number | null;
  title?: string;
  content?: string;
  entryDate?: string;
};
