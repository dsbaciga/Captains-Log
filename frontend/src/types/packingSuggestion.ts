/**
 * Packing suggestion categories
 */
export type PackingSuggestionCategory = 'clothing' | 'accessories' | 'gear' | 'health';

/**
 * Priority levels for packing suggestions
 */
export type PackingSuggestionPriority = 'essential' | 'recommended' | 'optional';

/**
 * A single packing suggestion based on weather analysis
 */
export interface PackingSuggestion {
  id: string;
  category: PackingSuggestionCategory;
  item: string;
  reason: string;
  priority: PackingSuggestionPriority;
}

/**
 * Weather conditions summary used for generating suggestions
 */
export interface WeatherConditionsSummary {
  minTemp: number | null;
  maxTemp: number | null;
  avgTemp: number | null;
  hasRain: boolean;
  hasSnow: boolean;
  maxPrecipitation: number;
  avgHumidity: number | null;
  maxWindSpeed: number | null;
  tempRange: number | null;
  conditions: string[];
}

/**
 * Response structure for packing suggestions
 */
export interface PackingSuggestionsResponse {
  suggestions: PackingSuggestion[];
  weatherSummary: WeatherConditionsSummary;
  tripDays: number;
}
