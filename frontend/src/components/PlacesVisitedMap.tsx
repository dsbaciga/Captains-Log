import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import MarkerClusterGroup from "@changey/react-leaflet-markercluster";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Location } from "../types/location";
import type { Transportation } from "../types/transportation";
import locationService from "../services/location.service";
import transportationService from "../services/transportation.service";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

// Fix for default marker icon in Leaflet with Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const PlacesVisitedMap = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [transportation, setTransportation] = useState<Transportation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    setLoading(true);
    try {
      const [locationData, transportationData] = await Promise.all([
        locationService.getAllVisitedLocations(),
        transportationService.getAllTransportation(),
      ]);
      console.log("Loaded locations:", locationData);
      console.log("Loaded transportation:", transportationData);
      setLocations(locationData);
      setTransportation(transportationData);
    } catch (error) {
      toast.error("Failed to load map data");
      console.error("Error loading map data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Places Visited
        </h2>
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          Loading map...
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Places Visited
        </h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No visited locations yet. Add locations with coordinates to your trips
          to see them here.
        </div>
      </div>
    );
  }

  // Filter locations with valid coordinates
  const validLocations = locations.filter((loc) => {
    const isValid =
      loc.latitude != null &&
      loc.longitude != null &&
      !isNaN(Number(loc.latitude)) &&
      !isNaN(Number(loc.longitude));
    if (!isValid) {
      console.log("Invalid location:", loc);
    }
    return isValid;
  });

  if (validLocations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Places Visited
        </h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No locations with valid coordinates found. Add latitude and longitude
          to your locations to see them on the map.
        </div>
      </div>
    );
  }

  // Calculate center of all locations
  const centerLat =
    validLocations.reduce((sum, loc) => sum + loc.latitude!, 0) /
    validLocations.length;
  const centerLng =
    validLocations.reduce((sum, loc) => sum + loc.longitude!, 0) /
    validLocations.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Places Visited
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {locations.length} {locations.length === 1 ? "location" : "locations"}
          {transportation.length > 0 && (
            <span className="ml-3">
              • {transportation.filter(t => t.route).length} routes
            </span>
          )}
        </div>
      </div>

      <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative z-0">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={3}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MarkerClusterGroup chunkedLoading>
            {locations.map((location) => {
              if (!location.latitude || !location.longitude) return null;

              return (
                <Marker
                  key={location.id}
                  position={[location.latitude, location.longitude]}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {location.name}
                      </h3>
                      {location.address && (
                        <p className="text-sm text-gray-600 mb-2">
                          {location.address}
                        </p>
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
          </MarkerClusterGroup>

          {/* Transportation Routes */}
          {transportation.map((t) => {
            if (!t.route) return null;

            // Color code by transportation type
            const getRouteColor = (type: string) => {
              switch (type) {
                case 'flight': return '#3b82f6'; // blue
                case 'train': return '#8b5cf6'; // purple
                case 'bus': return '#f59e0b'; // amber
                case 'car': return '#10b981'; // green
                case 'ferry': return '#14b8a6'; // teal
                case 'bicycle': return '#ec4899'; // pink
                case 'walk': return '#eab308'; // yellow
                default: return '#6b7280'; // gray
              }
            };

            const pathOptions = {
              color: getRouteColor(t.type),
              weight: 2,
              opacity: 0.6,
              dashArray: t.type === 'flight' ? '10, 10' : undefined,
            };

            return (
              <Polyline
                key={`route-${t.id}`}
                positions={[
                  [t.route.from.latitude, t.route.from.longitude],
                  [t.route.to.latitude, t.route.to.longitude],
                ]}
                pathOptions={pathOptions}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-gray-900 mb-1 capitalize">
                      {t.type}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t.route.from.name} → {t.route.to.name}
                    </p>
                    {t.carrier && (
                      <p className="text-sm text-gray-600 mt-1">
                        {t.carrier}
                      </p>
                    )}
                  </div>
                </Popup>
              </Polyline>
            );
          })}
        </MapContainer>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.slice(0, 6).map((location) => (
          <div
            key={location.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-700"
          >
            <h4 className="font-medium text-gray-900 dark:text-white">
              {location.name}
            </h4>
            {location.address && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {location.address}
              </p>
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
