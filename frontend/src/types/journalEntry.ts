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
  locationAssignments?: {
    id: number;
    location: {
      id: number;
      name: string;
    };
  }[];
  activityAssignments?: {
    id: number;
    activity: {
      id: number;
      name: string;
    };
  }[];
  lodgingAssignments?: {
    id: number;
    lodging: {
      id: number;
      name: string;
    };
  }[];
  transportationAssignments?: {
    id: number;
    transportation: {
      id: number;
      type: string;
    };
  }[];
};

export type CreateJournalEntryInput = {
  tripId: number;
  locationIds?: number[];
  activityIds?: number[];
  lodgingIds?: number[];
  transportationIds?: number[];
  title: string;
  content: string;
  entryDate?: string;
};

export type UpdateJournalEntryInput = {
  locationIds?: number[];
  activityIds?: number[];
  lodgingIds?: number[];
  transportationIds?: number[];
  title?: string;
  content?: string;
  entryDate?: string | null;
};
