import type { Transportation } from "../types/transportation";

interface TransportationStatsProps {
  transportation: Transportation[];
}

export default function TransportationStats({
  transportation,
}: TransportationStatsProps) {
  // Calculate statistics
  const stats = {
    totalFlights: transportation.filter((t) => t.type === "flight").length,
    upcomingFlights: transportation.filter(
      (t) => t.type === "flight" && t.isUpcoming
    ).length,
    completedFlights: transportation.filter(
      (t) => t.type === "flight" && !t.isUpcoming
    ).length,
    totalDistance: 0,
    totalDuration: 0,
    carriers: new Set<string>(),
  };

  // Calculate total distance (prefer calculated route distance, fallback to Haversine)
  transportation.forEach((t) => {
    // Use calculated distance if available (from backend routing service)
    if (t.calculatedDistance) {
      stats.totalDistance += t.calculatedDistance;
    } else if (t.route) {
      // Fallback to Haversine formula if no calculated distance
      const distance = calculateDistance(
        t.route.from.latitude,
        t.route.from.longitude,
        t.route.to.latitude,
        t.route.to.longitude
      );
      stats.totalDistance += distance;
    }

    if (t.durationMinutes) {
      stats.totalDuration += t.durationMinutes;
    }

    if (t.type === "flight" && t.carrier) {
      stats.carriers.add(t.carrier);
    }
  });

  // Find most frequent routes
  const routeCount = new Map<string, number>();
  transportation.forEach((t) => {
    if (t.route) {
      const routeKey = `${t.route.from.name} → ${t.route.to.name}`;
      routeCount.set(routeKey, (routeCount.get(routeKey) || 0) + 1);
    }
  });

  const topRoutes = Array.from(routeCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };

  if (stats.totalFlights === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Flight Statistics
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats.totalFlights}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Flights
          </div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats.upcomingFlights}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Upcoming
          </div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">
            {stats.completedFlights}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Completed
          </div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {stats.carriers.size}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Airlines
          </div>
        </div>
      </div>

      {stats.totalDistance > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Total Distance
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(stats.totalDistance).toLocaleString()} km
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {Math.round(stats.totalDistance * 0.621371).toLocaleString()} miles
              {transportation.some(t => t.distanceSource === 'route') && (
                <span className="ml-2 text-green-600 dark:text-green-400">
                  • Route-based
                </span>
              )}
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Total Flight Time
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatDuration(stats.totalDuration)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {Math.round(stats.totalDuration / 60)} hours
            </div>
          </div>
        </div>
      )}

      {topRoutes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Most Frequent Routes
          </h4>
          <div className="space-y-2">
            {topRoutes.map(([route, count], index) => (
              <div
                key={route}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-gray-700 dark:text-gray-300">
                  {index + 1}. {route}
                </span>
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  {count}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Haversine formula to calculate distance between two coordinates
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
