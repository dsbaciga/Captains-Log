import { useState } from 'react';
import type { WeatherDisplay } from '../types/weather';
import {
  getWeatherIcon,
  formatTemperatureRange,
  formatPrecipitation,
  formatHumidity,
  formatWindSpeed,
} from '../utils/weatherIcons';

interface WeatherCardProps {
  weather: WeatherDisplay;
  temperatureUnit?: 'C' | 'F';
  compact?: boolean;
}

export default function WeatherCard({
  weather,
  temperatureUnit = 'F',
  compact = true,
}: WeatherCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const icon = getWeatherIcon(weather.conditions);
  const tempRange = formatTemperatureRange(
    weather.high,
    weather.low,
    temperatureUnit
  );

  if (compact) {
    return (
      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl" role="img" aria-label="Weather icon">
              {icon}
            </span>
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                {weather.conditions || 'No data'}
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {tempRange}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            {weather.precipitation !== null && (
              <div className="flex items-center gap-1">
                <span>💧</span>
                <span>{formatPrecipitation(weather.precipitation)}</span>
              </div>
            )}

            {weather.humidity !== null && (
              <div className="flex items-center gap-1">
                <span>💨</span>
                <span>{formatHumidity(weather.humidity)}</span>
              </div>
            )}

            {showDetails && weather.windSpeed !== null && (
              <div className="flex items-center gap-1">
                <span>🌬️</span>
                <span>{formatWindSpeed(weather.windSpeed)}</span>
              </div>
            )}

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
              aria-label={showDetails ? 'Hide details' : 'Show details'}
            >
              {showDetails ? '−' : '+'}
            </button>
          </div>
        </div>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">
                Precipitation
              </div>
              <div className="font-medium text-gray-900 dark:text-white">
                {formatPrecipitation(weather.precipitation)}
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Humidity</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {formatHumidity(weather.humidity)}
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Wind Speed</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {formatWindSpeed(weather.windSpeed)}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Expanded view (for future use)
  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-4 mb-4">
        <span className="text-5xl" role="img" aria-label="Weather icon">
          {icon}
        </span>
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {tempRange}
          </div>
          <div className="text-lg text-gray-700 dark:text-gray-300 capitalize">
            {weather.conditions || 'No data'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-gray-500 dark:text-gray-400">Precipitation</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {formatPrecipitation(weather.precipitation)}
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400">Humidity</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {formatHumidity(weather.humidity)}
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400">Wind Speed</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {formatWindSpeed(weather.windSpeed)}
          </div>
        </div>
      </div>
    </div>
  );
}
