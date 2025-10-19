export type WeatherData = {
  id: number;
  tripId: number;
  locationId: number | null;
  date: string; // ISO date string
  temperatureHigh: number | null;
  temperatureLow: number | null;
  conditions: string | null;
  precipitation: number | null;
  humidity: number | null;
  windSpeed: number | null;
  fetchedAt: string; // ISO datetime string
  createdAt: string;
};

export type WeatherDisplay = {
  date: string;
  high: number | null;
  low: number | null;
  conditions: string | null;
  icon: string;
  precipitation: number | null;
  humidity: number | null;
  windSpeed: number | null;
};
