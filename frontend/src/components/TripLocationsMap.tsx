import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location } from '../types/location';

// Import shared map utilities (this also sets up leaflet icons)
import { calculateMapCenter, filterValidCoordinates } from '../utils/mapUtils';
import '../utils/mapUtils'; // Ensure leaflet icons are set up

// Import reusable components
import EmptyState from './EmptyState';

interface TripLocationsMapProps {
  locations: Location[];
}

// Component to automatically fit bounds to show all markers
function MapBounds({ locations }: { locations: Location[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) return;

    const validLocations = filterValidCoordinates(locations);

    if (validLocations.length === 0) return;

    if (validLocations.length === 1) {
      // If only one location, center on it with a reasonable zoom
      const loc = validLocations[0];
      map.setView([Number(loc.latitude), Number(loc.longitude)], 13);
    } else {
      // If multiple locations, fit bounds to show all
      const bounds = new LatLngBounds(
        validLocations.map((loc) => [Number(loc.latitude), Number(loc.longitude)])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, map]);

  return null;
}

export default function TripLocationsMap({ locations }: TripLocationsMapProps) {
  const validLocations = filterValidCoordinates(locations);

  if (validLocations.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8">
        <EmptyState.Compact
          icon="🗺️"
          message="No locations with coordinates to display on the map."
        />
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2 text-center">
          Add coordinates to your locations to see them on the map.
        </p>
      </div>
    );
  }

  // Calculate center point using shared utility
  const center = calculateMapCenter(validLocations);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Location Map
        </h3>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {validLocations.length} location{validLocations.length !== 1 ? 's' : ''} shown
        </span>
      </div>

      <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBounds locations={validLocations} />
          {validLocations.map((location) => (
            <Marker
              key={location.id}
              position={[Number(location.latitude), Number(location.longitude)]}
            >
              <Popup>
                <div className="p-2">
                  <h4 className="font-semibold text-gray-900">{location.name}</h4>
                  {location.address && (
                    <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                  )}
                  {location.notes && (
                    <p className="text-sm text-gray-500 mt-2 italic">{location.notes}</p>
                  )}
                  {location.category && (
                    <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {location.category.name}
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400">
        <p>💡 Click on markers to see location details</p>
      </div>
    </div>
  );
}
