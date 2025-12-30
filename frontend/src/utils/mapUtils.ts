import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

/**
 * Fix for default marker icons in React-Leaflet
 * This must be called once at app initialization or before using Leaflet maps
 */
export function setupLeafletIcons() {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
  });
}

// Also export a pre-configured default icon for custom use
export const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Set up icons immediately on import
setupLeafletIcons();
L.Marker.prototype.options.icon = DefaultIcon;

interface Coordinates {
  latitude: number | string | null;
  longitude: number | string | null;
}

/**
 * Calculate the center point of a collection of coordinates
 * @param locations - Array of objects with latitude and longitude properties
 * @returns Object with lat and lng, or default center if no valid coordinates
 */
export function calculateMapCenter<T extends Coordinates>(
  locations: T[]
): { lat: number; lng: number } {
  const validLocations = locations.filter(
    (loc) => loc.latitude != null && loc.longitude != null
  );

  if (validLocations.length === 0) {
    // Default to center of world if no valid locations
    return { lat: 0, lng: 0 };
  }

  const lat =
    validLocations.reduce((sum, loc) => sum + Number(loc.latitude), 0) /
    validLocations.length;
  const lng =
    validLocations.reduce((sum, loc) => sum + Number(loc.longitude), 0) /
    validLocations.length;

  return { lat, lng };
}

/**
 * Filter locations to only those with valid coordinates
 * @param locations - Array of objects with latitude and longitude properties
 * @returns Filtered array with only valid coordinates
 */
export function filterValidCoordinates<T extends Coordinates>(
  locations: T[]
): T[] {
  return locations.filter(
    (loc) => loc.latitude != null && loc.longitude != null
  );
}

/**
 * Calculate appropriate zoom level based on the spread of locations
 * @param locations - Array of objects with latitude and longitude properties
 * @returns Suggested zoom level (1-18)
 */
export function calculateZoomLevel<T extends Coordinates>(
  locations: T[]
): number {
  const validLocations = filterValidCoordinates(locations);

  if (validLocations.length === 0) return 2;
  if (validLocations.length === 1) return 13;

  const lats = validLocations.map((loc) => Number(loc.latitude));
  const lngs = validLocations.map((loc) => Number(loc.longitude));

  const latSpread = Math.max(...lats) - Math.min(...lats);
  const lngSpread = Math.max(...lngs) - Math.min(...lngs);
  const maxSpread = Math.max(latSpread, lngSpread);

  // Rough zoom level calculation based on coordinate spread
  if (maxSpread > 100) return 2;
  if (maxSpread > 50) return 3;
  if (maxSpread > 20) return 4;
  if (maxSpread > 10) return 5;
  if (maxSpread > 5) return 6;
  if (maxSpread > 2) return 7;
  if (maxSpread > 1) return 8;
  if (maxSpread > 0.5) return 10;
  if (maxSpread > 0.1) return 12;
  return 13;
}

export { L };

