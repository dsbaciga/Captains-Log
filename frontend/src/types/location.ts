export type Location = {
  id: number;
  tripId: number;
  parentId: number | null;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  categoryId: number | null;
  visitDatetime: string | null;
  visitDurationMinutes: number | null;
  notes: string | null;
  isFavorite: boolean;
  /** Raw OpenStreetMap `opening_hours` string, e.g. "Mo-Fr 09:00-17:00; Su off". */
  openingHours: string | null;
  /** 'osm' when auto-populated from OpenStreetMap, 'manual' when the user typed it in. */
  openingHoursSource: string | null;
  /** IANA timezone of the place. Opening hours are wall-clock times in this zone. */
  timezone: string | null;
  createdAt: string;
  updatedAt: string;
  category?: LocationCategory | null;
  parent?: {
    id: number;
    name: string;
  } | null;
  children?: {
    id: number;
    name: string;
    latitude: number | null;
    longitude: number | null;
    visitDatetime: string | null;
    category?: LocationCategory | null;
  }[];
  trip?: {
    id: number;
    title: string;
    startDate: string | null;
    endDate: string | null;
  } | null;
  photoAlbums?: {
    id: number;
    name: string;
    description: string | null;
    _count?: {
      photoAssignments: number;
    };
  }[];
};

export type LocationCategory = {
  id: number;
  userId: number | null;
  name: string;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  createdAt: string;
};

export type CreateLocationInput = {
  tripId: number;
  parentId?: number | null;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  categoryId?: number;
  visitDatetime?: string;
  visitDurationMinutes?: number;
  notes?: string;
  openingHours?: string;
  timezone?: string;
};

export type UpdateLocationInput = Omit<Partial<CreateLocationInput>, 'tripId' | 'parentId' | 'categoryId' | 'openingHours' | 'timezone'> & {
  parentId?: number | null;
  categoryId?: number | null;
  isFavorite?: boolean;
  /** Send null to clear, which also re-enables automatic population from OpenStreetMap. */
  openingHours?: string | null;
  timezone?: string | null;
};
