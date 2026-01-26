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
  geometry?: number[][]; // Array of [longitude, latitude] coordinates from OpenRouteService
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
  connectionGroupId: string | null; // For grouping multi-leg journeys
  createdAt: string;
  updatedAt: string;
  fromLocation?: {
    id: number;
    name: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  toLocation?: {
    id: number;
    name: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  route?: TransportationRoute | null;
  durationMinutes?: number | null;
  calculatedDistance?: number | null; // Route distance in kilometers
  calculatedDuration?: number | null; // Route duration in minutes
  distanceSource?: 'route' | 'haversine' | null; // Source of distance calculation
  isUpcoming?: boolean;
  isInProgress?: boolean;
  flightTracking?: FlightTracking | null;
};

export type FlightTracking = {
  id: number;
  transportationId: number;
  flightNumber: string | null;
  airlineCode: string | null;
  status: 'scheduled' | 'active' | 'landed' | 'cancelled' | 'diverted' | null;
  gate: string | null;
  terminal: string | null;
  baggageClaim: string | null;
  departureDelay: number | null;
  arrivalDelay: number | null;
  scheduledDeparture: string | null;
  actualDeparture: string | null;
  scheduledArrival: string | null;
  actualArrival: string | null;
  lastUpdatedAt: string;
  createdAt: string;
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
