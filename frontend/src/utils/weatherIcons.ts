/**
 * Get weather icon emoji based on conditions
 */
export const getWeatherIcon = (conditions: string | null): string => {
  if (!conditions) return '🌡️';

  const lower = conditions.toLowerCase();

  // Clear/Sunny
  if (lower.includes('clear') || lower.includes('sunny')) return '☀️';

  // Partly cloudy
  if (lower.includes('partly cloudy') || lower.includes('few clouds'))
    return '⛅';

  // Cloudy
  if (
    lower.includes('cloud') ||
    lower.includes('overcast') ||
    lower.includes('scattered clouds')
  )
    return '☁️';

  // Rain
  if (
    lower.includes('rain') ||
    lower.includes('drizzle') ||
    lower.includes('shower')
  )
    return '🌧️';

  // Thunderstorm
  if (lower.includes('storm') || lower.includes('thunder')) return '⛈️';

  // Snow
  if (lower.includes('snow') || lower.includes('sleet') || lower.includes('ice'))
    return '❄️';

  // Fog/Mist
  if (
    lower.includes('fog') ||
    lower.includes('mist') ||
    lower.includes('haze')
  )
    return '🌫️';

  // Wind
  if (lower.includes('wind')) return '💨';

  // Default
  return '🌡️';
};

/**
 * Format temperature with unit
 */
export const formatTemperature = (
  temp: number | null,
  unit: 'C' | 'F' = 'F'
): string => {
  if (temp === null) return '--';
  return `${Math.round(temp)}°${unit}`;
};

/**
 * Format temperature range (high/low)
 */
export const formatTemperatureRange = (
  high: number | null,
  low: number | null,
  unit: 'C' | 'F' = 'F'
): string => {
  const highStr = formatTemperature(high, unit);
  const lowStr = formatTemperature(low, unit);
  return `${highStr} / ${lowStr}`;
};

/**
 * Format precipitation percentage
 */
export const formatPrecipitation = (precipitation: number | null): string => {
  if (precipitation === null) return '--';
  return `${Math.round(precipitation)}%`;
};

/**
 * Format humidity percentage
 */
export const formatHumidity = (humidity: number | null): string => {
  if (humidity === null) return '--';
  return `${Math.round(humidity)}%`;
};

/**
 * Format wind speed
 */
export const formatWindSpeed = (
  windSpeed: number | null,
  unit: 'mph' | 'kph' = 'mph'
): string => {
  if (windSpeed === null) return '--';
  return `${Math.round(windSpeed)} ${unit}`;
};
