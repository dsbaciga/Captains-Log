import { useMemo } from 'react';
import { ChevronRightIcon, MapPinIcon } from '../icons';

interface MapPreviewWidgetProps {
  locations: {
    id: number;
    name: string;
    latitude: number | null;
    longitude: number | null;
    category?: string;
  }[];
  onNavigateToMap: () => void;
  onLocationClick?: (locationId: number) => void;
}

/**
 * Map icon for the empty state
 */
function MapIcon({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  );
}

/**
 * Globe icon for the map preview header
 */
function GlobeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

/**
 * Calculates the bounding box of locations with coordinates
 */
function calculateBounds(
  locations: { latitude: number | null; longitude: number | null }[]
): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  const validLocations = locations.filter(
    (loc): loc is { latitude: number; longitude: number } =>
      loc.latitude !== null && loc.longitude !== null
  );

  if (validLocations.length === 0) return null;

  const lats = validLocations.map((loc) => loc.latitude);
  const lngs = validLocations.map((loc) => loc.longitude);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

/**
 * Normalizes a coordinate to a position within the preview area (0-100%)
 */
function normalizePosition(
  lat: number,
  lng: number,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): { x: number; y: number } {
  const latRange = bounds.maxLat - bounds.minLat;
  const lngRange = bounds.maxLng - bounds.minLng;

  // Add padding so markers don't sit on edges
  const padding = 0.15;

  // Handle single point case
  if (latRange === 0 && lngRange === 0) {
    return { x: 50, y: 50 };
  }

  // Normalize to 0-1 range with padding
  const normalizedLng =
    lngRange === 0
      ? 0.5
      : padding + ((lng - bounds.minLng) / lngRange) * (1 - 2 * padding);
  const normalizedLat =
    latRange === 0
      ? 0.5
      : padding + ((bounds.maxLat - lat) / latRange) * (1 - 2 * padding);

  return {
    x: normalizedLng * 100,
    y: normalizedLat * 100,
  };
}

/**
 * Individual location marker on the preview map
 */
interface LocationMarkerProps {
  name: string;
  x: number;
  y: number;
  index: number;
  onClick?: (e?: React.MouseEvent) => void;
}

function LocationMarker({ name, x, y, index, onClick }: LocationMarkerProps) {
  return (
    <button
      type="button"
      className={`absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full
        bg-primary-500 dark:bg-gold
        border-2 border-white dark:border-navy-800
        shadow-md
        hover:scale-125 hover:z-10
        transition-transform duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 dark:focus-visible:ring-gold/50
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${index * 100}ms`,
      }}
      onClick={onClick}
      title={name}
      aria-label={`Location: ${name}`}
    />
  );
}

/**
 * Location list item
 */
interface LocationListItemProps {
  name: string;
  category?: string;
  onClick?: () => void;
}

function LocationListItem({ name, category, onClick }: LocationListItemProps) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-lg
        hover:bg-primary-50/50 dark:hover:bg-navy-700/50
        transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 dark:focus-visible:ring-gold/50
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
      onClick={onClick}
    >
      <MapPinIcon className="w-4 h-4 flex-shrink-0 text-primary-500 dark:text-gold" />
      <span className="text-sm text-charcoal dark:text-warm-gray truncate flex-1">
        {name}
      </span>
      {category && (
        <span className="text-xs text-slate dark:text-warm-gray/60 truncate max-w-[80px]">
          {category}
        </span>
      )}
    </button>
  );
}

/**
 * MapPreviewWidget - Dashboard widget showing a mini map preview of trip locations
 *
 * Features:
 * - Lightweight CSS-based map preview (no heavy map library)
 * - Shows location markers positioned by coordinates
 * - Displays location count badge
 * - Lists first 3-4 location names
 * - Click to expand to full map view
 * - Dark mode support
 * - Empty state when no locations
 */
export default function MapPreviewWidget({
  locations,
  onNavigateToMap,
  onLocationClick,
}: MapPreviewWidgetProps) {
  // Filter locations with valid coordinates
  const locationsWithCoords = useMemo(
    () =>
      locations.filter(
        (loc) => loc.latitude !== null && loc.longitude !== null
      ),
    [locations]
  );

  // Calculate bounds for positioning markers
  const bounds = useMemo(
    () => calculateBounds(locationsWithCoords),
    [locationsWithCoords]
  );

  // Calculate marker positions
  const markerPositions = useMemo(() => {
    if (!bounds) return [];
    return locationsWithCoords.map((loc) => ({
      ...loc,
      position: normalizePosition(loc.latitude!, loc.longitude!, bounds),
    }));
  }, [locationsWithCoords, bounds]);

  // Get locations to display in list (first 4)
  const displayLocations = locations.slice(0, 4);
  const remainingCount = locations.length - displayLocations.length;

  // Check states
  const hasLocations = locations.length > 0;
  const hasCoordinates = locationsWithCoords.length > 0;

  // Empty state - no locations at all
  if (!hasLocations) {
    return (
      <div className="card animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-charcoal dark:text-warm-gray font-body flex items-center gap-2">
            <GlobeIcon className="w-5 h-5 text-primary-500 dark:text-gold" />
            Map
          </h3>
          <button
            onClick={onNavigateToMap}
            className="p-1.5 rounded-lg text-slate hover:text-primary-600 dark:text-warm-gray/50 dark:hover:text-gold
              hover:bg-primary-50 dark:hover:bg-navy-700 transition-colors duration-200"
            aria-label="Go to Map"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Empty State */}
        <div className="text-center py-6">
          <div className="mb-2">
            <MapIcon className="w-12 h-12 mx-auto text-primary-300 dark:text-gold/40" />
          </div>
          <p className="text-sm text-slate dark:text-warm-gray/70 mb-3">
            No locations added yet
          </p>
          <button
            onClick={onNavigateToMap}
            className="text-sm font-medium text-primary-600 dark:text-gold hover:underline"
          >
            Add a location
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-charcoal dark:text-warm-gray font-body flex items-center gap-2">
            <GlobeIcon className="w-5 h-5 text-primary-500 dark:text-gold" />
            Map
          </h3>
          {/* Location count badge */}
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-gold/20 dark:text-gold">
            {locations.length} {locations.length === 1 ? 'location' : 'locations'}
          </span>
        </div>
        <button
          onClick={onNavigateToMap}
          className="p-1.5 rounded-lg text-slate hover:text-primary-600 dark:text-warm-gray/50 dark:hover:text-gold
            hover:bg-primary-50 dark:hover:bg-navy-700 transition-colors duration-200"
          aria-label="Go to Map"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Map Preview Area */}
      <div
        className="relative h-32 rounded-xl overflow-hidden mb-4 cursor-pointer group"
        onClick={onNavigateToMap}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onNavigateToMap();
          }
        }}
        aria-label="Click to view full map"
      >
        {/* Background pattern to suggest a map */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary-50 to-primary-100/50
            dark:from-navy-700 dark:to-navy-800
            transition-all duration-300
            group-hover:from-primary-100 group-hover:to-primary-200/50
            dark:group-hover:from-navy-600 dark:group-hover:to-navy-700"
        >
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-20 dark:opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(to right, currentColor 1px, transparent 1px),
                linear-gradient(to bottom, currentColor 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />

          {/* Subtle compass rose decoration */}
          <div className="absolute top-2 right-2 opacity-20 dark:opacity-10">
            <svg className="w-8 h-8 text-primary-500 dark:text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="1" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeWidth="1" />
              <path d="M12 8l-2 4 2 4 2-4-2-4z" fill="currentColor" strokeWidth="0" />
            </svg>
          </div>
        </div>

        {/* Location markers */}
        {hasCoordinates ? (
          <div className="absolute inset-0">
            {markerPositions.slice(0, 10).map((loc, index) => (
              <LocationMarker
                key={loc.id}
                name={loc.name}
                x={loc.position.x}
                y={loc.position.y}
                index={index}
                onClick={
                  onLocationClick
                    ? (e) => {
                        e?.stopPropagation();
                        onLocationClick(loc.id);
                      }
                    : undefined
                }
              />
            ))}
            {markerPositions.length > 10 && (
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-white/80 dark:bg-navy-800/80 text-xs font-medium text-charcoal dark:text-warm-gray">
                +{markerPositions.length - 10} more
              </div>
            )}
          </div>
        ) : (
          /* No coordinates fallback */
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPinIcon className="w-8 h-8 mx-auto text-primary-400 dark:text-gold/60 mb-1" />
              <p className="text-xs text-slate dark:text-warm-gray/70">
                Coordinates not set
              </p>
            </div>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-primary-500/0 group-hover:bg-primary-500/10 dark:group-hover:bg-gold/10 transition-colors duration-300 flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-3 py-1.5 rounded-full bg-white/90 dark:bg-navy-800/90 text-sm font-medium text-primary-600 dark:text-gold shadow-lg">
            View full map
          </span>
        </div>
      </div>

      {/* Location List */}
      <div className="space-y-0.5">
        {displayLocations.map((location) => (
          <LocationListItem
            key={location.id}
            name={location.name}
            category={location.category}
            onClick={onLocationClick ? () => onLocationClick(location.id) : undefined}
          />
        ))}
      </div>

      {/* Remaining count */}
      {remainingCount > 0 && (
        <p className="text-xs text-slate dark:text-warm-gray/60 mt-2 pl-2">
          +{remainingCount} more {remainingCount === 1 ? 'location' : 'locations'}
        </p>
      )}

      {/* Footer Link */}
      <div className="mt-4 pt-3 border-t border-slate/10 dark:border-warm-gray/10">
        <button
          onClick={onNavigateToMap}
          className="w-full text-center text-sm font-medium text-primary-600 dark:text-gold hover:underline
            py-1.5 rounded-lg hover:bg-primary-50/50 dark:hover:bg-navy-700/30 transition-colors duration-200"
        >
          View full map
        </button>
      </div>
    </div>
  );
}
