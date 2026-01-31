import { z } from 'zod';

/**
 * Packing suggestion categories
 */
export const packingSuggestionCategory = z.enum([
  'clothing',
  'accessories',
  'gear',
  'health',
]);

export type PackingSuggestionCategory = z.infer<typeof packingSuggestionCategory>;

/**
 * Priority levels for packing suggestions
 */
export const packingSuggestionPriority = z.enum([
  'essential',
  'recommended',
  'optional',
]);

export type PackingSuggestionPriority = z.infer<typeof packingSuggestionPriority>;

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
