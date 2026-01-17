import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import locationService from "../services/location.service";
import type { Location } from "../types/location";
import toast from "react-hot-toast";
import "leaflet/dist/leaflet.css";

// Import shared utilities
import { calculateMapCenter, filterValidCoordinates } from "../utils/mapUtils";
import "../utils/mapUtils"; // This import runs the leaflet icon setup

// Import reusable components
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { CloseIcon } from "../components/icons";

export default function PlacesVisitedPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );

  useEffect(() => {
    loadVisitedLocations();
  }, []);

  const loadVisitedLocations = async () => {
    try {
      setLoading(true);
      const data = await locationService.getAllVisitedLocations();
      setLocations(data);
    } catch {
      toast.error("Failed to load visited places");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner.FullPage message="Loading your visited places..." />
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Places Visited
        </h1>
        <EmptyState
          icon="🌍"
          message="No places visited yet"
          subMessage="Locations from completed trips will appear here"
          actionLabel="Go to Trips"
          actionHref="/trips"
        />
      </div>
    );
  }

  // Calculate center of map based on all locations using shared utility
  const validLocations = filterValidCoordinates(locations);
  const center = calculateMapCenter(validLocations);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Places Visited
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {locations.length}{" "}
                {locations.length === 1 ? "location" : "locations"} from your
                travels
              </p>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                Click markers to view details
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Map and Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative z-0">
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={4}
            className="h-full w-full z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={20}
            />
            {validLocations.map((location) => (
              <Marker
                key={location.id}
                position={[
                  Number(location.latitude),
                  Number(location.longitude),
                ]}
                eventHandlers={{
                  click: () => setSelectedLocation(location),
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h3 className="font-semibold text-lg mb-1">
                      {location.name}
                    </h3>
                    {location.category && (
                      <p className="text-sm text-gray-600 mb-2">
                        {location.category.icon} {location.category.name}
                      </p>
                    )}
                    {location.trip && (
                      <p className="text-sm text-gray-600 mb-2">
                        Trip:{" "}
                        <Link
                          to={`/trips/${location.trip.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {location.trip.title}
                        </Link>
                      </p>
                    )}
                    {location.address && (
                      <p className="text-sm text-gray-600 mb-2">
                        {location.address}
                      </p>
                    )}
                    {location.notes && (
                      <p className="text-sm text-gray-700 mt-2 border-t pt-2">
                        {location.notes}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Sidebar - Selected Location Details */}
        {selectedLocation && (
          <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Location Details
              </h2>
              <button
                onClick={() => setSelectedLocation(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Close location details"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                  {selectedLocation.name}
                </h3>
                {selectedLocation.category && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedLocation.category.icon}{" "}
                    {selectedLocation.category.name}
                  </p>
                )}
              </div>

              {selectedLocation.address && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedLocation.address}
                  </p>
                </div>
              )}

              {selectedLocation.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {selectedLocation.notes}
                  </p>
                </div>
              )}

              {selectedLocation.latitude && selectedLocation.longitude && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Coordinates
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                    {Number(selectedLocation.latitude).toFixed(6)},{" "}
                    {Number(selectedLocation.longitude).toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
