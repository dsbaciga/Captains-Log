export type Activity = {
  id: number;
  tripId: number;
  locationId: number | null;
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
  createdAt: string;
  updatedAt: string;
  location?: {
    id: number;
    name: string;
  };
  parent?: {
    id: number;
    name: string;
  };
  children?: {
    id: number;
    name: string;
    startTime: string | null;
    endTime: string | null;
    category: string | null;
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

export type CreateActivityInput = {
  tripId: number;
  locationId?: number;
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

export type UpdateActivityInput = {
  locationId?: number | null;
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
