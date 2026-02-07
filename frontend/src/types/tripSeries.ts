export interface TripSeries {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  trips?: TripSeriesTrip[];
  _count?: { trips: number };
}

export interface TripSeriesTrip {
  id: number;
  title: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  seriesOrder: number | null;
  tripType?: string | null;
  tripTypeEmoji?: string | null;
}

export interface CreateTripSeriesInput {
  name: string;
  description?: string | null;
}

export interface UpdateTripSeriesInput {
  name?: string;
  description?: string | null;
}
