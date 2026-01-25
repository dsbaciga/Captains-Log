/**
 * Mocks for external services used by Travel Life application
 *
 * Includes mocks for:
 * - Nominatim (geocoding)
 * - OpenRouteService (routing/distance)
 * - Immich (photo library)
 * - OpenWeatherMap (weather data)
 * - AviationStack (flight tracking)
 */

import { jest } from '@jest/globals';

// ============================================================================
// NOMINATIM GEOCODING MOCK
// ============================================================================

export interface NominatimSearchResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  class: string;
  type: string;
  place_rank: number;
  importance: number;
  addresstype: string;
  name: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  boundingbox: [string, string, string, string];
}

export interface NominatimReverseResult extends NominatimSearchResult {
  // Reverse geocoding returns same structure
}

export const mockNominatimSearchResults: NominatimSearchResult[] = [
  {
    place_id: 12345,
    licence: 'Data OpenStreetMap contributors',
    osm_type: 'node',
    osm_id: 67890,
    lat: '40.7580',
    lon: '-73.9855',
    class: 'tourism',
    type: 'attraction',
    place_rank: 20,
    importance: 0.8,
    addresstype: 'tourism',
    name: 'Times Square',
    display_name: 'Times Square, Manhattan, New York, NY 10036, United States',
    address: {
      road: 'Broadway',
      neighbourhood: 'Times Square',
      suburb: 'Manhattan',
      city: 'New York',
      county: 'New York County',
      state: 'New York',
      postcode: '10036',
      country: 'United States',
      country_code: 'us',
    },
    boundingbox: ['40.7550', '40.7610', '-73.9890', '-73.9820'],
  },
  {
    place_id: 23456,
    licence: 'Data OpenStreetMap contributors',
    osm_type: 'way',
    osm_id: 78901,
    lat: '40.7484',
    lon: '-73.9857',
    class: 'building',
    type: 'yes',
    place_rank: 30,
    importance: 0.9,
    addresstype: 'building',
    name: 'Empire State Building',
    display_name: 'Empire State Building, 350 5th Avenue, Manhattan, New York, NY 10118, United States',
    address: {
      house_number: '350',
      road: '5th Avenue',
      neighbourhood: 'Midtown',
      suburb: 'Manhattan',
      city: 'New York',
      county: 'New York County',
      state: 'New York',
      postcode: '10118',
      country: 'United States',
      country_code: 'us',
    },
    boundingbox: ['40.7478', '40.7490', '-73.9866', '-73.9848'],
  },
];

/**
 * Mock Nominatim service
 */
export const mockNominatimService = {
  search: jest.fn<() => Promise<NominatimSearchResult[]>>()
    .mockResolvedValue(mockNominatimSearchResults),
  reverse: jest.fn<() => Promise<NominatimReverseResult | null>>()
    .mockResolvedValue(mockNominatimSearchResults[0]),
};

/**
 * Setup Nominatim mock with custom results
 */
export const setupNominatimMock = (results: NominatimSearchResult[] = mockNominatimSearchResults) => {
  mockNominatimService.search.mockResolvedValue(results);
  if (results.length > 0) {
    mockNominatimService.reverse.mockResolvedValue(results[0]);
  } else {
    mockNominatimService.reverse.mockResolvedValue(null);
  }
};

/**
 * Setup Nominatim mock to return no results
 */
export const setupNominatimNoResults = () => {
  mockNominatimService.search.mockResolvedValue([]);
  mockNominatimService.reverse.mockResolvedValue(null);
};

/**
 * Setup Nominatim mock to throw an error
 */
export const setupNominatimError = (errorMessage = 'Nominatim service unavailable') => {
  mockNominatimService.search.mockRejectedValue(new Error(errorMessage));
  mockNominatimService.reverse.mockRejectedValue(new Error(errorMessage));
};

// ============================================================================
// OPENROUTESERVICE ROUTING MOCK
// ============================================================================

export interface RouteResult {
  distance: number; // in meters
  duration: number; // in seconds
  geometry?: {
    type: string;
    coordinates: [number, number][];
  };
}

export const mockRouteResult: RouteResult = {
  distance: 5234.5, // ~5.2 km
  duration: 782, // ~13 minutes
  geometry: {
    type: 'LineString',
    coordinates: [
      [-73.9855, 40.7580],
      [-73.9860, 40.7520],
      [-73.9857, 40.7484],
    ],
  },
};

/**
 * Mock OpenRouteService
 */
export const mockOpenRouteService = {
  getRoute: jest.fn<() => Promise<RouteResult>>()
    .mockResolvedValue(mockRouteResult),
  getMatrix: jest.fn<() => Promise<{ distances: number[][]; durations: number[][] }>>()
    .mockResolvedValue({
      distances: [[0, 5234.5], [5234.5, 0]],
      durations: [[0, 782], [782, 0]],
    }),
};

/**
 * Setup OpenRouteService mock with custom result
 */
export const setupRoutingMock = (result: RouteResult = mockRouteResult) => {
  mockOpenRouteService.getRoute.mockResolvedValue(result);
};

/**
 * Setup OpenRouteService mock to fall back to Haversine
 */
export const setupRoutingFallback = () => {
  mockOpenRouteService.getRoute.mockRejectedValue(new Error('OpenRouteService unavailable'));
};

// ============================================================================
// IMMICH PHOTO LIBRARY MOCK
// ============================================================================

export interface ImmichAsset {
  id: string;
  deviceAssetId: string;
  ownerId: string;
  deviceId: string;
  type: 'IMAGE' | 'VIDEO';
  originalPath: string;
  resizePath: string;
  thumbhash: string | null;
  fileCreatedAt: string;
  fileModifiedAt: string;
  updatedAt: string;
  isFavorite: boolean;
  isArchived: boolean;
  isOffline: boolean;
  duration: string | null;
  exifInfo?: {
    make?: string;
    model?: string;
    imageName?: string;
    exifImageWidth?: number;
    exifImageHeight?: number;
    orientation?: string;
    dateTimeOriginal?: string;
    modifyDate?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    state?: string;
    country?: string;
    description?: string;
  };
}

export interface ImmichAlbum {
  id: string;
  albumName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  shared: boolean;
  owner: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  assets: ImmichAsset[];
  assetCount: number;
}

export const mockImmichAssets: ImmichAsset[] = [
  {
    id: 'immich-asset-uuid-12345',
    deviceAssetId: 'device-asset-1',
    ownerId: 'user-uuid-1',
    deviceId: 'device-1',
    type: 'IMAGE',
    originalPath: '/upload/library/user-uuid-1/2024/07/photo1.jpg',
    resizePath: '/upload/thumbs/user-uuid-1/thumb1.webp',
    thumbhash: null,
    fileCreatedAt: '2024-07-05T10:30:00.000Z',
    fileModifiedAt: '2024-07-05T10:30:00.000Z',
    updatedAt: '2024-07-05T18:00:00.000Z',
    isFavorite: false,
    isArchived: false,
    isOffline: false,
    duration: null,
    exifInfo: {
      make: 'Apple',
      model: 'iPhone 14 Pro',
      dateTimeOriginal: '2024-07-05T10:30:00.000Z',
      latitude: 41.8902,
      longitude: 12.4922,
      city: 'Rome',
      state: 'Lazio',
      country: 'Italy',
    },
  },
  {
    id: 'immich-asset-uuid-67890',
    deviceAssetId: 'device-asset-2',
    ownerId: 'user-uuid-1',
    deviceId: 'device-1',
    type: 'VIDEO',
    originalPath: '/upload/library/user-uuid-1/2024/07/video1.mp4',
    resizePath: '/upload/thumbs/user-uuid-1/thumb2.webp',
    thumbhash: null,
    fileCreatedAt: '2024-07-06T11:00:00.000Z',
    fileModifiedAt: '2024-07-06T11:00:00.000Z',
    updatedAt: '2024-07-06T20:00:00.000Z',
    isFavorite: true,
    isArchived: false,
    isOffline: false,
    duration: '00:02:00.000',
    exifInfo: {
      make: 'Apple',
      model: 'iPhone 14 Pro',
      dateTimeOriginal: '2024-07-06T11:00:00.000Z',
      latitude: 41.9029,
      longitude: 12.4534,
      city: 'Vatican City',
      country: 'Vatican City',
    },
  },
];

export const mockImmichAlbums: ImmichAlbum[] = [
  {
    id: 'immich-album-uuid-1',
    albumName: 'Italy Trip 2024',
    description: 'Photos from our Italy vacation',
    createdAt: '2024-07-01T00:00:00.000Z',
    updatedAt: '2024-07-10T00:00:00.000Z',
    shared: false,
    owner: {
      id: 'user-uuid-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
    },
    assets: mockImmichAssets,
    assetCount: 2,
  },
];

/**
 * Mock Immich service
 */
export const mockImmichService = {
  validateConnection: jest.fn<() => Promise<boolean>>()
    .mockResolvedValue(true),
  getAsset: jest.fn<() => Promise<ImmichAsset | null>>()
    .mockResolvedValue(mockImmichAssets[0]),
  getAssets: jest.fn<() => Promise<ImmichAsset[]>>()
    .mockResolvedValue(mockImmichAssets),
  getAlbums: jest.fn<() => Promise<ImmichAlbum[]>>()
    .mockResolvedValue(mockImmichAlbums),
  getAlbumAssets: jest.fn<() => Promise<ImmichAsset[]>>()
    .mockResolvedValue(mockImmichAssets),
  searchAssets: jest.fn<() => Promise<ImmichAsset[]>>()
    .mockResolvedValue(mockImmichAssets),
  getThumbnailUrl: jest.fn<() => string>()
    .mockReturnValue('http://localhost:2283/api/asset/thumbnail/immich-asset-uuid-12345'),
  getAssetUrl: jest.fn<() => string>()
    .mockReturnValue('http://localhost:2283/api/asset/file/immich-asset-uuid-12345'),
};

/**
 * Setup Immich mock with custom assets
 */
export const setupImmichMock = (assets: ImmichAsset[] = mockImmichAssets) => {
  mockImmichService.validateConnection.mockResolvedValue(true);
  mockImmichService.getAsset.mockResolvedValue(assets[0] || null);
  mockImmichService.getAssets.mockResolvedValue(assets);
  mockImmichService.searchAssets.mockResolvedValue(assets);
};

/**
 * Setup Immich mock for no connection
 */
export const setupImmichNoConnection = () => {
  mockImmichService.validateConnection.mockResolvedValue(false);
  mockImmichService.getAsset.mockRejectedValue(new Error('Immich connection failed'));
  mockImmichService.getAssets.mockRejectedValue(new Error('Immich connection failed'));
};

// ============================================================================
// OPENWEATHERMAP WEATHER MOCK
// ============================================================================

export interface WeatherData {
  lat: number;
  lon: number;
  timezone: string;
  current: {
    dt: number;
    temp: number;
    feels_like: number;
    humidity: number;
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    wind_speed: number;
  };
  daily?: Array<{
    dt: number;
    temp: {
      min: number;
      max: number;
    };
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    humidity: number;
    wind_speed: number;
    pop: number; // Probability of precipitation
  }>;
}

export const mockWeatherData: WeatherData = {
  lat: 40.7580,
  lon: -73.9855,
  timezone: 'America/New_York',
  current: {
    dt: 1704067200, // 2024-01-01T00:00:00Z
    temp: 5.2,
    feels_like: 2.1,
    humidity: 65,
    weather: [
      {
        id: 800,
        main: 'Clear',
        description: 'clear sky',
        icon: '01d',
      },
    ],
    wind_speed: 3.5,
  },
  daily: [
    {
      dt: 1704067200,
      temp: {
        min: 2.1,
        max: 8.5,
      },
      weather: [
        {
          id: 800,
          main: 'Clear',
          description: 'clear sky',
          icon: '01d',
        },
      ],
      humidity: 60,
      wind_speed: 3.2,
      pop: 0.1,
    },
  ],
};

/**
 * Mock OpenWeatherMap service
 */
export const mockWeatherService = {
  getCurrentWeather: jest.fn<() => Promise<WeatherData>>()
    .mockResolvedValue(mockWeatherData),
  getForecast: jest.fn<() => Promise<WeatherData>>()
    .mockResolvedValue(mockWeatherData),
  getHistoricalWeather: jest.fn<() => Promise<WeatherData>>()
    .mockResolvedValue(mockWeatherData),
};

/**
 * Setup weather mock with custom data
 */
export const setupWeatherMock = (data: WeatherData = mockWeatherData) => {
  mockWeatherService.getCurrentWeather.mockResolvedValue(data);
  mockWeatherService.getForecast.mockResolvedValue(data);
  mockWeatherService.getHistoricalWeather.mockResolvedValue(data);
};

/**
 * Setup weather mock for service unavailable
 */
export const setupWeatherUnavailable = () => {
  mockWeatherService.getCurrentWeather.mockRejectedValue(new Error('Weather API unavailable'));
  mockWeatherService.getForecast.mockRejectedValue(new Error('Weather API unavailable'));
  mockWeatherService.getHistoricalWeather.mockRejectedValue(new Error('Weather API unavailable'));
};

// ============================================================================
// AVIATIONSTACK FLIGHT TRACKING MOCK
// ============================================================================

export interface FlightData {
  flight_date: string;
  flight_status: 'scheduled' | 'active' | 'landed' | 'cancelled' | 'incident' | 'diverted';
  departure: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    terminal: string | null;
    gate: string | null;
    delay: number | null;
    scheduled: string;
    estimated: string;
    actual: string | null;
  };
  arrival: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    terminal: string | null;
    gate: string | null;
    baggage: string | null;
    delay: number | null;
    scheduled: string;
    estimated: string;
    actual: string | null;
  };
  airline: {
    name: string;
    iata: string;
    icao: string;
  };
  flight: {
    number: string;
    iata: string;
    icao: string;
  };
}

export const mockFlightData: FlightData = {
  flight_date: '2024-03-15',
  flight_status: 'scheduled',
  departure: {
    airport: 'John F. Kennedy International',
    timezone: 'America/New_York',
    iata: 'JFK',
    icao: 'KJFK',
    terminal: '1',
    gate: 'B22',
    delay: null,
    scheduled: '2024-03-15T08:00:00+00:00',
    estimated: '2024-03-15T08:00:00+00:00',
    actual: null,
  },
  arrival: {
    airport: 'London Heathrow',
    timezone: 'Europe/London',
    iata: 'LHR',
    icao: 'EGLL',
    terminal: '5',
    gate: null,
    baggage: null,
    delay: null,
    scheduled: '2024-03-15T20:00:00+00:00',
    estimated: '2024-03-15T20:00:00+00:00',
    actual: null,
  },
  airline: {
    name: 'British Airways',
    iata: 'BA',
    icao: 'BAW',
  },
  flight: {
    number: '178',
    iata: 'BA178',
    icao: 'BAW178',
  },
};

/**
 * Mock AviationStack service
 */
export const mockFlightService = {
  getFlightStatus: jest.fn<() => Promise<FlightData | null>>()
    .mockResolvedValue(mockFlightData),
  searchFlights: jest.fn<() => Promise<FlightData[]>>()
    .mockResolvedValue([mockFlightData]),
};

/**
 * Setup flight mock with custom data
 */
export const setupFlightMock = (data: FlightData = mockFlightData) => {
  mockFlightService.getFlightStatus.mockResolvedValue(data);
  mockFlightService.searchFlights.mockResolvedValue([data]);
};

/**
 * Setup flight mock for no results
 */
export const setupFlightNotFound = () => {
  mockFlightService.getFlightStatus.mockResolvedValue(null);
  mockFlightService.searchFlights.mockResolvedValue([]);
};

// ============================================================================
// RESET ALL EXTERNAL API MOCKS
// ============================================================================

/**
 * Reset all external API mocks to their default state
 */
export const resetExternalApiMocks = () => {
  // Reset Nominatim
  mockNominatimService.search.mockReset();
  mockNominatimService.reverse.mockReset();
  mockNominatimService.search.mockResolvedValue(mockNominatimSearchResults);
  mockNominatimService.reverse.mockResolvedValue(mockNominatimSearchResults[0]);

  // Reset OpenRouteService
  mockOpenRouteService.getRoute.mockReset();
  mockOpenRouteService.getMatrix.mockReset();
  mockOpenRouteService.getRoute.mockResolvedValue(mockRouteResult);

  // Reset Immich
  mockImmichService.validateConnection.mockReset();
  mockImmichService.getAsset.mockReset();
  mockImmichService.getAssets.mockReset();
  mockImmichService.getAlbums.mockReset();
  mockImmichService.getAlbumAssets.mockReset();
  mockImmichService.searchAssets.mockReset();
  mockImmichService.validateConnection.mockResolvedValue(true);
  mockImmichService.getAsset.mockResolvedValue(mockImmichAssets[0]);
  mockImmichService.getAssets.mockResolvedValue(mockImmichAssets);
  mockImmichService.getAlbums.mockResolvedValue(mockImmichAlbums);
  mockImmichService.getAlbumAssets.mockResolvedValue(mockImmichAssets);
  mockImmichService.searchAssets.mockResolvedValue(mockImmichAssets);

  // Reset Weather
  mockWeatherService.getCurrentWeather.mockReset();
  mockWeatherService.getForecast.mockReset();
  mockWeatherService.getHistoricalWeather.mockReset();
  mockWeatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
  mockWeatherService.getForecast.mockResolvedValue(mockWeatherData);
  mockWeatherService.getHistoricalWeather.mockResolvedValue(mockWeatherData);

  // Reset Flight
  mockFlightService.getFlightStatus.mockReset();
  mockFlightService.searchFlights.mockReset();
  mockFlightService.getFlightStatus.mockResolvedValue(mockFlightData);
  mockFlightService.searchFlights.mockResolvedValue([mockFlightData]);
};
