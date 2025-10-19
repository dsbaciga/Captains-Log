export type LodgingType =
  | 'hotel'
  | 'hostel'
  | 'airbnb'
  | 'vacation_rental'
  | 'camping'
  | 'resort'
  | 'motel'
  | 'bed_and_breakfast'
  | 'apartment'
  | 'friends_family'
  | 'other';

export type Lodging = {
  id: number;
  tripId: number;
  type: LodgingType;
  name: string;
  locationId: number | null;
  address: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  timezone: string | null;
  confirmationNumber: string | null;
  cost: number | null;
  currency: string | null;
  bookingUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  location?: {
    id: number;
    name: string;
  };
  photoAlbums?: {
    id: number;
    name: string;
    description: string | null;
    _count?: {
      photoAssignments: number;
    };
  }[];
};

export type CreateLodgingInput = {
  tripId: number;
  type: LodgingType;
  name: string;
  locationId?: number;
  address?: string;
  checkInDate?: string;
  checkOutDate?: string;
  timezone?: string;
  confirmationNumber?: string;
  cost?: number;
  currency?: string;
  bookingUrl?: string;
  notes?: string;
};

export type UpdateLodgingInput = {
  type?: LodgingType;
  name?: string;
  locationId?: number | null;
  address?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  timezone?: string | null;
  confirmationNumber?: string | null;
  cost?: number | null;
  currency?: string | null;
  bookingUrl?: string | null;
  notes?: string | null;
};
