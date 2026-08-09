// A user-defined catch-all entity attached to a trip.
// See docs/development/CUSTOM_ITEM_SPEC.md

export type CustomItemType = {
  id: number;
  userId: number;
  name: string;
  icon: string | null;
  color: string | null;
  // Provenance only — a seeded starter type. Never gates editing or deletion.
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

// Unlike Activity, the location association IS a direct FK: it means "the item
// is at this place" and drives the map marker.
export type CustomItem = {
  id: number;
  tripId: number;
  typeId: number | null;
  name: string;
  notes: string | null;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  timezone: string | null;
  locationId: number | null;
  cost: number | null;
  currency: string | null;
  url: string | null;
  confirmationNumber: string | null;
  createdAt: string;
  updatedAt: string;
  type?: {
    id: number;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
  location?: {
    id: number;
    name: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
};

export type CreateCustomItemInput = {
  tripId: number;
  typeId?: number | null;
  name: string;
  notes?: string;
  allDay?: boolean;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  locationId?: number | null;
  cost?: number;
  currency?: string;
  url?: string;
  confirmationNumber?: string;
};

export type UpdateCustomItemInput = {
  typeId?: number | null;
  name?: string;
  notes?: string | null;
  allDay?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  timezone?: string | null;
  locationId?: number | null;
  cost?: number | null;
  currency?: string | null;
  url?: string | null;
  confirmationNumber?: string | null;
};

export type CreateCustomItemTypeInput = {
  name: string;
  icon?: string | null;
  color?: string | null;
};

export type UpdateCustomItemTypeInput = {
  name?: string;
  icon?: string | null;
  color?: string | null;
};
