import { verifyTripAccess } from '../utils/serviceHelpers';
import weatherService from './weather.service';
import type {
  PackingSuggestion,
  PackingSuggestionCategory,
  PackingSuggestionPriority,
  WeatherConditionsSummary,
  PackingSuggestionsResponse,
} from '../types/packingSuggestion.types';

/**
 * Temperature thresholds in Fahrenheit
 */
const TEMP_THRESHOLDS = {
  COLD: 50, // Below 50°F is cold
  HOT: 85,  // Above 85°F is hot
  FREEZING: 32, // Below 32°F is freezing
};

/**
 * Weather condition thresholds
 */
const WEATHER_THRESHOLDS = {
  HIGH_HUMIDITY: 70, // Above 70% is high humidity
  HIGH_WIND: 20, // Above 20 mph is windy
  WIDE_TEMP_RANGE: 25, // 25+ degree difference between min and max
};

/**
 * Suggestion definitions organized by trigger condition
 */
interface SuggestionTemplate {
  category: PackingSuggestionCategory;
  item: string;
  reason: string;
  priority: PackingSuggestionPriority;
}

const COLD_WEATHER_SUGGESTIONS: SuggestionTemplate[] = [
  { category: 'clothing', item: 'Warm jacket or coat', reason: 'Temperatures will be below 50°F', priority: 'essential' },
  { category: 'clothing', item: 'Layering pieces (sweaters, fleece)', reason: 'Cold weather expected', priority: 'essential' },
  { category: 'accessories', item: 'Warm hat or beanie', reason: 'Protect your head from cold', priority: 'recommended' },
  { category: 'accessories', item: 'Gloves', reason: 'Keep hands warm in cold temperatures', priority: 'recommended' },
  { category: 'accessories', item: 'Scarf', reason: 'Extra warmth for cold weather', priority: 'optional' },
  { category: 'clothing', item: 'Warm socks', reason: 'Keep feet warm in cold conditions', priority: 'recommended' },
];

const FREEZING_WEATHER_SUGGESTIONS: SuggestionTemplate[] = [
  { category: 'clothing', item: 'Thermal underwear/base layers', reason: 'Freezing temperatures expected (below 32°F)', priority: 'essential' },
  { category: 'clothing', item: 'Insulated winter boots', reason: 'Protect feet from freezing temperatures', priority: 'essential' },
  { category: 'health', item: 'Lip balm', reason: 'Prevent chapped lips in freezing weather', priority: 'recommended' },
  { category: 'health', item: 'Hand warmers', reason: 'Extra warmth for freezing temperatures', priority: 'optional' },
];

const HOT_WEATHER_SUGGESTIONS: SuggestionTemplate[] = [
  { category: 'health', item: 'Sunscreen (SPF 30+)', reason: 'Protect skin from sun exposure', priority: 'essential' },
  { category: 'clothing', item: 'Light, breathable clothing', reason: 'Temperatures above 85°F expected', priority: 'essential' },
  { category: 'accessories', item: 'Sun hat or cap', reason: 'Shield face from intense sun', priority: 'recommended' },
  { category: 'accessories', item: 'Sunglasses', reason: 'Protect eyes from bright sunlight', priority: 'recommended' },
  { category: 'gear', item: 'Reusable water bottle', reason: 'Stay hydrated in hot weather', priority: 'essential' },
  { category: 'health', item: 'Aloe vera gel', reason: 'Soothe potential sunburn', priority: 'optional' },
];

const RAIN_SUGGESTIONS: SuggestionTemplate[] = [
  { category: 'gear', item: 'Umbrella', reason: 'Rain is predicted during your trip', priority: 'essential' },
  { category: 'clothing', item: 'Rain jacket or poncho', reason: 'Stay dry during wet weather', priority: 'essential' },
  { category: 'gear', item: 'Waterproof bag or dry bag', reason: 'Protect electronics and valuables from rain', priority: 'recommended' },
  { category: 'clothing', item: 'Waterproof shoes or boots', reason: 'Keep feet dry in rainy conditions', priority: 'recommended' },
];

const SNOW_SUGGESTIONS: SuggestionTemplate[] = [
  { category: 'clothing', item: 'Waterproof winter boots', reason: 'Snow is expected during your trip', priority: 'essential' },
  { category: 'clothing', item: 'Waterproof outer layer', reason: 'Stay dry in snowy conditions', priority: 'essential' },
  { category: 'accessories', item: 'Waterproof gloves', reason: 'Keep hands dry and warm in snow', priority: 'essential' },
];

const HIGH_HUMIDITY_SUGGESTIONS: SuggestionTemplate[] = [
  { category: 'clothing', item: 'Moisture-wicking clothes', reason: 'High humidity (above 70%) expected', priority: 'recommended' },
  { category: 'health', item: 'Anti-chafing balm', reason: 'Prevent discomfort from humidity', priority: 'optional' },
  { category: 'health', item: 'Extra deodorant', reason: 'Stay fresh in humid conditions', priority: 'optional' },
];

const WIDE_TEMP_RANGE_SUGGESTIONS: SuggestionTemplate[] = [
  { category: 'clothing', item: 'Versatile layers', reason: 'Temperature will vary significantly (25+ degree range)', priority: 'essential' },
  { category: 'clothing', item: 'Light jacket for evenings', reason: 'Cooler temperatures expected at night', priority: 'recommended' },
];

const WINDY_SUGGESTIONS: SuggestionTemplate[] = [
  { category: 'clothing', item: 'Windbreaker jacket', reason: 'Windy conditions expected', priority: 'recommended' },
  { category: 'accessories', item: 'Secure hat with chin strap', reason: 'Prevent hat from blowing away', priority: 'optional' },
];

class PackingSuggestionService {
  /**
   * Get packing suggestions for a trip based on weather data
   */
  async getSuggestionsForTrip(tripId: number, userId: number): Promise<PackingSuggestionsResponse> {
    // 1. Verify trip access
    const trip = await verifyTripAccess(userId, tripId);

    // 2. Fetch weather data for trip
    const weatherData = await weatherService.getWeatherForTrip(tripId, userId);

    // 3. Analyze weather conditions
    // Type assertion safety explanation:
    // - weatherService.getWeatherForTrip() returns WeatherData[] from Prisma, processed through convertDecimals()
    // - convertDecimals() recursively converts all Prisma.Decimal fields to JavaScript numbers
    // - The WeatherDataEntry interface below matches the subset of fields we access here:
    //   temperatureHigh, temperatureLow, conditions, precipitation, humidity, windSpeed
    // - All these fields are nullable in both Prisma schema and WeatherDataEntry
    // - The analyzeWeatherConditions method safely handles null/undefined for all fields
    const weatherSummary = this.analyzeWeatherConditions(weatherData as unknown as WeatherDataEntry[]);

    // 4. Calculate trip duration
    const tripDays = this.calculateTripDays(trip.startDate, trip.endDate);

    // 5. Generate suggestions based on conditions
    const suggestions = this.generateSuggestions(weatherSummary, tripDays);

    return {
      suggestions,
      weatherSummary,
      tripDays,
    };
  }

  /**
   * Calculate the number of days in the trip
   */
  private calculateTripDays(startDate: Date | null, endDate: Date | null): number {
    if (!startDate || !endDate) {
      return 0;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end days

    return diffDays;
  }

  /**
   * Analyze weather data to extract key conditions
   */
  private analyzeWeatherConditions(weatherData: WeatherDataEntry[]): WeatherConditionsSummary {
    if (!weatherData || weatherData.length === 0) {
      return {
        minTemp: null,
        maxTemp: null,
        avgTemp: null,
        hasRain: false,
        hasSnow: false,
        maxPrecipitation: 0,
        avgHumidity: null,
        maxWindSpeed: null,
        tempRange: null,
        conditions: [],
      };
    }

    const temps: number[] = [];
    const humidities: number[] = [];
    const windSpeeds: number[] = [];
    const allConditions: string[] = [];
    let maxPrecip = 0;
    let hasRain = false;
    let hasSnow = false;

    for (const day of weatherData) {
      // Collect temperatures
      if (day.temperatureHigh !== null && day.temperatureHigh !== undefined) {
        temps.push(Number(day.temperatureHigh));
      }
      if (day.temperatureLow !== null && day.temperatureLow !== undefined) {
        temps.push(Number(day.temperatureLow));
      }

      // Collect humidity
      if (day.humidity !== null && day.humidity !== undefined) {
        humidities.push(Number(day.humidity));
      }

      // Collect wind speed
      if (day.windSpeed !== null && day.windSpeed !== undefined) {
        windSpeeds.push(Number(day.windSpeed));
      }

      // Check precipitation
      if (day.precipitation !== null && day.precipitation !== undefined) {
        const precip = Number(day.precipitation);
        if (precip > 0) {
          maxPrecip = Math.max(maxPrecip, precip);
        }
      }

      // Check conditions for rain/snow
      if (day.conditions) {
        const conditionsLower = day.conditions.toLowerCase();
        allConditions.push(day.conditions);

        if (conditionsLower.includes('rain') || conditionsLower.includes('drizzle') || conditionsLower.includes('shower')) {
          hasRain = true;
        }
        if (conditionsLower.includes('snow') || conditionsLower.includes('sleet') || conditionsLower.includes('blizzard')) {
          hasSnow = true;
        }
      }
    }

    const minTemp = temps.length > 0 ? Math.min(...temps) : null;
    const maxTemp = temps.length > 0 ? Math.max(...temps) : null;
    const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
    const avgHumidity = humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : null;
    const maxWindSpeed = windSpeeds.length > 0 ? Math.max(...windSpeeds) : null;
    const tempRange = minTemp !== null && maxTemp !== null ? maxTemp - minTemp : null;

    // Also consider precipitation > 0 as potential rain
    if (maxPrecip > 0 && !hasSnow) {
      hasRain = true;
    }

    return {
      minTemp,
      maxTemp,
      avgTemp,
      hasRain,
      hasSnow,
      maxPrecipitation: maxPrecip,
      avgHumidity,
      maxWindSpeed,
      tempRange,
      conditions: Array.from(new Set(allConditions)), // Unique conditions
    };
  }

  /**
   * Generate packing suggestions based on weather summary
   */
  private generateSuggestions(
    weather: WeatherConditionsSummary,
    tripDays: number
  ): PackingSuggestion[] {
    const suggestions: PackingSuggestion[] = [];
    const addedItems = new Set<string>(); // Track added items to avoid duplicates

    const addSuggestions = (templates: SuggestionTemplate[]) => {
      for (const template of templates) {
        if (!addedItems.has(template.item)) {
          addedItems.add(template.item);
          suggestions.push({
            id: this.generateSuggestionId(template.category, template.item),
            ...template,
          });
        }
      }
    };

    // Cold weather suggestions (below 50°F)
    if (weather.minTemp !== null && weather.minTemp < TEMP_THRESHOLDS.COLD) {
      addSuggestions(COLD_WEATHER_SUGGESTIONS);

      // Freezing weather suggestions (below 32°F)
      if (weather.minTemp < TEMP_THRESHOLDS.FREEZING) {
        addSuggestions(FREEZING_WEATHER_SUGGESTIONS);
      }
    }

    // Hot weather suggestions (above 85°F)
    if (weather.maxTemp !== null && weather.maxTemp > TEMP_THRESHOLDS.HOT) {
      addSuggestions(HOT_WEATHER_SUGGESTIONS);
    }

    // Rain suggestions
    if (weather.hasRain || weather.maxPrecipitation > 0) {
      addSuggestions(RAIN_SUGGESTIONS);
    }

    // Snow suggestions
    if (weather.hasSnow) {
      addSuggestions(SNOW_SUGGESTIONS);
    }

    // High humidity suggestions
    if (weather.avgHumidity !== null && weather.avgHumidity > WEATHER_THRESHOLDS.HIGH_HUMIDITY) {
      addSuggestions(HIGH_HUMIDITY_SUGGESTIONS);
    }

    // Wide temperature range suggestions
    if (weather.tempRange !== null && weather.tempRange >= WEATHER_THRESHOLDS.WIDE_TEMP_RANGE) {
      addSuggestions(WIDE_TEMP_RANGE_SUGGESTIONS);
    }

    // Windy conditions suggestions
    if (weather.maxWindSpeed !== null && weather.maxWindSpeed > WEATHER_THRESHOLDS.HIGH_WIND) {
      addSuggestions(WINDY_SUGGESTIONS);
    }

    // Add trip-duration-based suggestions for longer trips
    if (tripDays > 7) {
      this.addLongTripSuggestions(suggestions, addedItems);
    }

    // Sort by priority (essential first, then recommended, then optional)
    const priorityOrder: Record<PackingSuggestionPriority, number> = {
      essential: 0,
      recommended: 1,
      optional: 2,
    };

    return suggestions.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by category
      return a.category.localeCompare(b.category);
    });
  }

  /**
   * Add suggestions specific to longer trips
   */
  private addLongTripSuggestions(suggestions: PackingSuggestion[], addedItems: Set<string>): void {
    const longTripSuggestions: SuggestionTemplate[] = [
      { category: 'gear', item: 'Travel laundry kit or detergent', reason: 'Longer trip may require washing clothes', priority: 'recommended' },
      { category: 'health', item: 'First aid kit', reason: 'Be prepared for minor injuries on extended trips', priority: 'recommended' },
    ];

    for (const template of longTripSuggestions) {
      if (!addedItems.has(template.item)) {
        addedItems.add(template.item);
        suggestions.push({
          id: this.generateSuggestionId(template.category, template.item),
          ...template,
        });
      }
    }
  }

  /**
   * Generate a unique ID for a suggestion
   */
  private generateSuggestionId(category: string, item: string): string {
    return `${category}-${item.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  }
}

/**
 * Weather data entry type representing the subset of fields from WeatherData
 * that are used by the packing suggestion analysis.
 *
 * This interface matches the output of weatherService.getWeatherForTrip() after
 * convertDecimals() processing:
 * - temperatureHigh/Low: Prisma Decimal -> number (Fahrenheit)
 * - precipitation: Prisma Decimal -> number (mm)
 * - humidity: Prisma Decimal -> number (percentage 0-100)
 * - windSpeed: Prisma Decimal -> number (mph)
 * - conditions: string description from OpenWeatherMap API
 *
 * All numeric fields are nullable as weather data may be unavailable for some dates.
 */
interface WeatherDataEntry {
  temperatureHigh: number | null;
  temperatureLow: number | null;
  conditions: string | null;
  precipitation: number | null;
  humidity: number | null;
  windSpeed: number | null;
}

export default new PackingSuggestionService();
