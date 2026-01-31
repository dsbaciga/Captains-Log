/**
 * Jet Lag Calculator Utility
 *
 * Calculates timezone differences and provides sleep adjustment recommendations
 * for travelers crossing time zones.
 */

export interface JetLagInfo {
  hoursDifference: number;
  direction: 'ahead' | 'behind' | 'same';
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  recommendations: string[];
  adjustmentDays: number;
  /** Indicates if timezone calculation failed and results may be incomplete */
  timezoneError?: boolean;
}

/**
 * Average hours the body can adjust per day when recovering from jet lag.
 * Research suggests most people adjust at a rate of about 1-2 hours per day,
 * with 1.5 hours being a reasonable conservative estimate for planning purposes.
 */
const HOURS_PER_ADJUSTMENT_DAY = 1.5;

/**
 * Get the UTC offset in hours for a given timezone
 * @param timezone IANA timezone string (e.g., "America/New_York")
 * @returns UTC offset in hours (positive = ahead of UTC, negative = behind UTC), or null if invalid
 */
function getTimezoneOffsetHours(timezone: string): number | null {
  try {
    // Create a date to get the current offset (accounts for DST)
    const date = new Date();

    // Format the date in the target timezone to get its offset
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    });

    const parts = formatter.formatToParts(date);
    const timeZonePart = parts.find((part) => part.type === 'timeZoneName');

    if (!timeZonePart?.value) {
      console.warn(`Could not determine timezone offset for "${timezone}": no timezone part found`);
      return null;
    }

    // Parse the offset string (e.g., "GMT-05:00" or "GMT+09:00")
    const offsetMatch = timeZonePart.value.match(/GMT([+-])(\d{2}):(\d{2})/);
    if (!offsetMatch) {
      // Handle simple "GMT" case (UTC)
      if (timeZonePart.value === 'GMT') {
        return 0;
      }
      console.warn(`Could not parse timezone offset from "${timeZonePart.value}" for timezone "${timezone}"`);
      return null;
    }

    const sign = offsetMatch[1] === '+' ? 1 : -1;
    const hours = parseInt(offsetMatch[2], 10);
    const minutes = parseInt(offsetMatch[3], 10);

    return sign * (hours + minutes / 60);
  } catch (error) {
    console.warn(`Failed to get timezone offset for "${timezone}":`, error);
    return null;
  }
}

/**
 * Calculate jet lag information between home and trip timezones
 * @param homeTimezone User's home timezone (IANA string)
 * @param tripTimezone Trip destination timezone (IANA string)
 * @returns JetLagInfo object with difference, severity, and recommendations
 */
export function calculateJetLag(homeTimezone: string, tripTimezone: string): JetLagInfo {
  // Handle missing timezones
  if (!homeTimezone || !tripTimezone) {
    return {
      hoursDifference: 0,
      direction: 'same',
      severity: 'none',
      recommendations: [],
      adjustmentDays: 0,
    };
  }

  // Get offsets for both timezones
  const homeOffset = getTimezoneOffsetHours(homeTimezone);
  const tripOffset = getTimezoneOffsetHours(tripTimezone);

  // Handle invalid timezones - return "same" with error flag
  if (homeOffset === null || tripOffset === null) {
    return {
      hoursDifference: 0,
      direction: 'same',
      severity: 'none',
      recommendations: ['Unable to calculate jet lag: one or more timezones could not be resolved.'],
      adjustmentDays: 0,
      timezoneError: true,
    };
  }

  // Calculate the raw difference (trip - home)
  // Positive = trip is ahead of home (traveling east)
  // Negative = trip is behind home (traveling west)
  const rawDifference = tripOffset - homeOffset;

  // Get absolute difference for severity calculation
  const absDifference = Math.abs(rawDifference);

  // Determine direction
  let direction: 'ahead' | 'behind' | 'same';
  if (rawDifference > 0) {
    direction = 'ahead'; // Destination is ahead (eastward travel)
  } else if (rawDifference < 0) {
    direction = 'behind'; // Destination is behind (westward travel)
  } else {
    direction = 'same';
  }

  // Determine severity based on hour difference
  // none: 0-2 hours (minimal adjustment needed)
  // mild: 3-5 hours (noticeable but manageable)
  // moderate: 6-8 hours (significant adjustment period)
  // severe: 9+ hours (major time shift, often half a day or more)
  let severity: 'none' | 'mild' | 'moderate' | 'severe';
  if (absDifference <= 2) {
    severity = 'none';
  } else if (absDifference <= 5) {
    severity = 'mild';
  } else if (absDifference <= 8) {
    severity = 'moderate';
  } else {
    severity = 'severe';
  }

  // Calculate adjustment days based on conservative estimate of body's adjustment rate
  const adjustmentDays = severity === 'none' ? 0 : Math.ceil(absDifference / HOURS_PER_ADJUSTMENT_DAY);

  // Generate recommendations based on direction and severity
  const recommendations = generateRecommendations(direction, severity, absDifference);

  return {
    hoursDifference: absDifference,
    direction,
    severity,
    recommendations,
    adjustmentDays,
  };
}

/**
 * Generate jet lag recommendations based on travel direction and severity
 */
function generateRecommendations(
  direction: 'ahead' | 'behind' | 'same',
  severity: 'none' | 'mild' | 'moderate' | 'severe',
  hoursDifference: number
): string[] {
  const recommendations: string[] = [];

  if (direction === 'same' || severity === 'none') {
    return ['No significant jet lag expected for this trip.'];
  }

  // Direction-specific advice
  if (direction === 'ahead') {
    // Eastward travel (losing hours, going to bed earlier)
    recommendations.push(
      'Start going to bed 30-60 minutes earlier a few days before departure'
    );
    recommendations.push(
      'Seek morning sunlight at your destination to help reset your body clock'
    );
    if (severity === 'severe' || severity === 'moderate') {
      recommendations.push(
        'Consider breaking up the adjustment by shifting sleep time gradually over several days'
      );
    }
  } else {
    // Westward travel (gaining hours, staying up later)
    recommendations.push(
      'Stay awake until local bedtime on arrival day, even if tired'
    );
    recommendations.push(
      'Seek evening sunlight at your destination to delay your body clock'
    );
    if (severity === 'severe' || severity === 'moderate') {
      recommendations.push(
        'Start going to bed 30-60 minutes later a few days before departure'
      );
    }
  }

  // General recommendations (always helpful)
  recommendations.push(
    'Stay well hydrated during your flight and avoid excessive alcohol'
  );
  recommendations.push(
    'Avoid caffeine after 2 PM local time at your destination'
  );

  if (severity === 'moderate' || severity === 'severe') {
    recommendations.push(
      'Consider short naps (20-30 min) if needed, but not too close to bedtime'
    );
    recommendations.push(
      'Try to eat meals at local times to help your body adjust faster'
    );
  }

  if (severity === 'severe') {
    recommendations.push(
      `Plan for about ${Math.ceil(hoursDifference / HOURS_PER_ADJUSTMENT_DAY)} days to fully adjust to the new timezone`
    );
    recommendations.push(
      'Consider arriving a day or two early for important events'
    );
  }

  return recommendations;
}

/**
 * Format the hour difference for display
 * @param hoursDifference The absolute hour difference
 * @param direction The travel direction
 * @returns Formatted string like "+5 hours" or "-3 hours"
 */
export function formatTimeDifference(
  hoursDifference: number,
  direction: 'ahead' | 'behind' | 'same'
): string {
  if (direction === 'same' || hoursDifference === 0) {
    return 'Same timezone';
  }

  const sign = direction === 'ahead' ? '+' : '-';
  const hourLabel = hoursDifference === 1 ? 'hour' : 'hours';

  return `${sign}${hoursDifference} ${hourLabel}`;
}
