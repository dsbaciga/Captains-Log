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

// Note: Location association is handled via EntityLink system, not direct FK
export type Lodging = {
  id: number;
  tripId: number;
  type: LodgingType;
  name: string;
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
export type CreateLodgingInput = {
  tripId: number;
  type: LodgingType;
  name: string;
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

// Note: Location association is handled via EntityLink system, not direct FK
export type UpdateLodgingInput = {
  type?: LodgingType;
  name?: string;
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
