// Note: Location association is handled via EntityLink system, not direct FK
export type Activity = {
  id: number;
  tripId: number;
  parentId: number | null;
  name: string;
  description: string | null;
  category: string | null;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  timezone: string | null;
  cost: number | null;
  currency: string | null;
  bookingUrl: string | null;
  bookingReference: string | null;
  notes: string | null;
  manualOrder: number | null;
  createdAt: string;
  updatedAt: string;
  parent?: {
    id: number;
    name: string;
  };
  children?: {
    id: number;
    name: string;
    description: string | null;
    startTime: string | null;
    endTime: string | null;
    timezone: string | null;
    category: string | null;
    cost: number | null;
    currency: string | null;
    bookingReference: string | null;
    notes: string | null;
    photoAlbums?: {
      id: number;
      name: string;
      description: string | null;
      _count?: {
        photoAssignments: number;
      };
    }[];
  }[];
  photoAlbums?: {
    id: number;
    name: string;
    description: string | null;
    _count?: {
      photoAssignments: number;
    };
  }[];
};

// Note: Location association is handled via EntityLink system, not direct FK
export type CreateActivityInput = {
  tripId: number;
  parentId?: number | null;
  name: string;
  description?: string;
  category?: string;
  allDay?: boolean;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  cost?: number;
  currency?: string;
  bookingUrl?: string;
  bookingReference?: string;
  notes?: string;
};

// Note: Location association is handled via EntityLink system, not direct FK
export type UpdateActivityInput = {
  parentId?: number | null;
  name?: string;
  description?: string | null;
  category?: string | null;
  allDay?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  timezone?: string | null;
  cost?: number | null;
  currency?: string | null;
  bookingUrl?: string | null;
  bookingReference?: string | null;
  notes?: string | null;
};
