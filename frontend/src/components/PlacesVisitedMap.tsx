import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location } from '../types/location';
import locationService from '../services/location.service';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

// Fix for default marker icon in Leaflet with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const PlacesVisitedMap = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisitedLocations();
  }, []);

  const loadVisitedLocations = async () => {
    setLoading(true);
    try {
      const data = await locationService.getAllVisitedLocations();
      console.log('Loaded locations:', data);
      setLocations(data);
    } catch (error) {
      toast.error('Failed to load visited locations');
      console.error('Error loading visited locations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Places Visited</h2>
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading map...</div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Places Visited</h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No visited locations yet. Add locations with coordinates to your trips to see them here.
        </div>
      </div>
    );
  }

  // Filter locations with valid coordinates
  const validLocations = locations.filter(loc => {
    const isValid = loc.latitude != null &&
      loc.longitude != null &&
      !isNaN(Number(loc.latitude)) &&
      !isNaN(Number(loc.longitude));
    if (!isValid) {
      console.log('Invalid location:', loc);
    }
    return isValid;
  });

  if (validLocations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Places Visited</h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No locations with valid coordinates found. Add latitude and longitude to your locations to see them on the map.
        </div>
      </div>
    );
  }

  // Calculate center of all locations
  const centerLat = validLocations.reduce((sum, loc) => sum + loc.latitude!, 0) / validLocations.length;
  const centerLng = validLocations.reduce((sum, loc) => sum + loc.longitude!, 0) / validLocations.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Places Visited</h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {locations.length} {locations.length === 1 ? 'location' : 'locations'}
        </div>
      </div>

      <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={3}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locations.map((location) => {
            if (!location.latitude || !location.longitude) return null;

            return (
              <Marker
                key={location.id}
                position={[location.latitude, location.longitude]}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-gray-900 mb-1">{location.name}</h3>
                    {location.address && (
                      <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                    )}
                    {location.trip && (
                      <Link
                        to={`/trips/${location.trip.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View Trip: {location.trip.title}
                      </Link>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.slice(0, 6).map((location) => (
          <div key={location.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white">{location.name}</h4>
            {location.address && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{location.address}</p>
            )}
            {location.trip && (
              <Link
                to={`/trips/${location.trip.id}`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-1 inline-block"
              >
                {location.trip.title}
              </Link>
            )}
          </div>
        ))}
      </div>

      {locations.length > 6 && (
        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          And {locations.length - 6} more locations...
        </div>
      )}
    </div>
  );
};

export default PlacesVisitedMap;
