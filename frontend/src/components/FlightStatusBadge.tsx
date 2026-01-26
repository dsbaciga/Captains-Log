import { FlightTracking } from '../types/transportation';

interface FlightStatusBadgeProps {
  flightTracking: FlightTracking | null | undefined;
  compact?: boolean;
}

/**
 * Displays flight status with appropriate styling
 */
export default function FlightStatusBadge({ flightTracking, compact = false }: FlightStatusBadgeProps) {
  if (!flightTracking) {
    return null;
  }

  const { status, gate, terminal, baggageClaim, departureDelay, arrivalDelay, flightNumber } = flightTracking;

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'landed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'diverted':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'scheduled':
        return '🕐';
      case 'active':
        return '✈️';
      case 'landed':
        return '✅';
      case 'cancelled':
        return '❌';
      case 'diverted':
        return '⚠️';
      default:
        return '📋';
    }
  };

  const formatDelay = (delay: number | null) => {
    if (!delay || delay === 0) return null;
    if (delay > 0) {
      return `+${delay}min late`;
    }
    return `${Math.abs(delay)}min early`;
  };

  const departureDelayText = formatDelay(departureDelay);
  const arrivalDelayText = formatDelay(arrivalDelay);

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {status && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {getStatusIcon(status)} {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        )}
        {departureDelayText && (
          <span className={`text-xs ${departureDelay && departureDelay > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {departureDelayText}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
      {/* Flight Number and Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {flightNumber && (
            <span className="font-mono font-semibold text-gray-900 dark:text-white">
              {flightNumber}
            </span>
          )}
        </div>
        {status && (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {getStatusIcon(status)} {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        )}
      </div>

      {/* Delay Info */}
      {(departureDelayText || arrivalDelayText) && (
        <div className="flex gap-4 text-sm">
          {departureDelayText && (
            <span className={departureDelay && departureDelay > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
              Departure: {departureDelayText}
            </span>
          )}
          {arrivalDelayText && (
            <span className={arrivalDelay && arrivalDelay > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
              Arrival: {arrivalDelayText}
            </span>
          )}
        </div>
      )}

      {/* Gate, Terminal, Baggage */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
        {terminal && (
          <div className="flex items-center gap-1">
            <span className="font-medium">Terminal:</span>
            <span className="text-gray-900 dark:text-white">{terminal}</span>
          </div>
        )}
        {gate && (
          <div className="flex items-center gap-1">
            <span className="font-medium">Gate:</span>
            <span className="text-gray-900 dark:text-white">{gate}</span>
          </div>
        )}
        {baggageClaim && (
          <div className="flex items-center gap-1">
            <span className="font-medium">Baggage:</span>
            <span className="text-gray-900 dark:text-white">{baggageClaim}</span>
          </div>
        )}
      </div>

      {/* Last Updated */}
      {flightTracking.lastUpdatedAt && (
        <div className="text-xs text-gray-500 dark:text-gray-500">
          Updated: {new Date(flightTracking.lastUpdatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
