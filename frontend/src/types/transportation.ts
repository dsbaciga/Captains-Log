export type TransportationType =
  | 'flight'
  | 'train'
  | 'bus'
  | 'car'
  | 'ferry'
  | 'bicycle'
  | 'walk'
  | 'other';

export type TransportationRoute = {
  from: {
    name: string;
    latitude: number;
    longitude: number;
  };
  to: {
    name: string;
    latitude: number;
    longitude: number;
  };
};

export type Transportation = {
  id: number;
  tripId: number;
  type: TransportationType;
  fromLocationId: number | null;
  toLocationId: number | null;
  fromLocationName: string | null;
  toLocationName: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  startTimezone: string | null;
  endTimezone: string | null;
  carrier: string | null;
  vehicleNumber: string | null;
  confirmationNumber: string | null;
  cost: number | null;
  currency: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  fromLocation?: {
    id: number;
    name: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  toLocation?: {
    id: number;
    name: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  journalAssignments?: {
    id: number;
    journal: {
      id: number;
      title: string | null;
      content: string;
      date: string | null;
      entryType: string;
    };
  }[];
  route?: TransportationRoute | null;
  durationMinutes?: number | null;
  isUpcoming?: boolean;
  isInProgress?: boolean;
  flightTracking?: {
    id: number;
    flightNumber: string | null;
    airlineCode: string | null;
    status: string | null;
    gate: string | null;
    terminal: string | null;
    baggageClaim: string | null;
  } | null;
};

export type CreateTransportationInput = {
  tripId: number;
  type: TransportationType;
  fromLocationId?: number;
  toLocationId?: number;
  fromLocationName?: string;
  toLocationName?: string;
  departureTime?: string;
  arrivalTime?: string;
  startTimezone?: string;
  endTimezone?: string;
  carrier?: string;
  vehicleNumber?: string;
  confirmationNumber?: string;
  cost?: number;
  currency?: string;
  notes?: string;
};

export type UpdateTransportationInput = {
  type?: TransportationType;
  fromLocationId?: number | null;
  toLocationId?: number | null;
  fromLocationName?: string | null;
  toLocationName?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  startTimezone?: string | null;
  endTimezone?: string | null;
  carrier?: string | null;
  vehicleNumber?: string | null;
  confirmationNumber?: string | null;
  cost?: number | null;
  currency?: string | null;
  notes?: string | null;
};
