export type Location = {
  id: number;
  tripId: number;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  categoryId: number | null;
  visitDatetime: string | null;
  visitDurationMinutes: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  category?: LocationCategory | null;
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
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  categoryId?: number;
  visitDatetime?: string;
  visitDurationMinutes?: number;
  notes?: string;
};

export type UpdateLocationInput = Omit<Partial<CreateLocationInput>, 'tripId'>;
