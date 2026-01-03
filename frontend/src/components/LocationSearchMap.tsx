import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import geocodingService from '../services/geocoding.service';
import type { GeocodingResult } from '../services/geocoding.service';
import toast from 'react-hot-toast';

// Fix for default marker icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface LocationSearchMapProps {
  onLocationSelect: (data: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
  initialPosition?: { lat: number; lng: number };
}

// Component to handle map clicks
function MapClickHandler({ onClick }: { onClick: (latlng: LatLng) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng);
    },
  });
  return null;
}

const LocationSearchMap = ({ onLocationSelect, initialPosition }: LocationSearchMapProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(
    initialPosition || null
  );
  const [selectedName, setSelectedName] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const searchTimeoutRef = useRef<number | null>(null);

  // Default center (world view)
  const defaultCenter = { lat: 20, lng: 0 };
  const mapCenter = selectedPosition || initialPosition || defaultCenter;

  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await geocodingService.searchPlaces(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSearchResultClick = (result: GeocodingResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    setSelectedPosition({ lat, lng });
    setSelectedName(result.display_name.split(',')[0]);
    setSelectedAddress(result.display_name);
    setSearchQuery('');
    setSearchResults([]);

    onLocationSelect({
      name: result.display_name.split(',')[0],
      address: result.display_name,
      latitude: lat,
      longitude: lng,
    });
  };

  const handleMapClick = async (latlng: LatLng) => {
    setSelectedPosition({ lat: latlng.lat, lng: latlng.lng });

    // Reverse geocode to get address
    try {
      const result = await geocodingService.reverseGeocode(latlng.lat, latlng.lng);
      if (result) {
        const name = result.display_name.split(',')[0];
        const address = result.display_name;
        setSelectedName(name);
        setSelectedAddress(address);

        onLocationSelect({
          name,
          address,
          latitude: latlng.lat,
          longitude: latlng.lng,
        });
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
      toast.error('Failed to get address for this location');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a place (e.g., Eiffel Tower, Paris)"
            className="input pr-10 w-full"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-[1000] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                onClick={() => handleSearchResultClick(result)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {result.display_name.split(',')[0]}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{result.display_name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Location Info */}
      {selectedPosition && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm text-blue-900">
            <strong>Selected:</strong> {selectedName || 'Custom location'}
          </div>
          {selectedAddress && (
            <div className="text-sm text-blue-700 mt-1">{selectedAddress}</div>
          )}
          <div className="text-xs text-blue-600 mt-1">
            Coordinates: {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200">
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={selectedPosition ? 13 : 2}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          key={`${mapCenter.lat}-${mapCenter.lng}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onClick={handleMapClick} />
          {selectedPosition && (
            <Marker position={[selectedPosition.lat, selectedPosition.lng]} />
          )}
        </MapContainer>
      </div>

      <p className="text-sm text-gray-600">
        💡 Search for a place above or click directly on the map to select a location
      </p>
    </div>
  );
};

export default LocationSearchMap;
