import { Marker, Popup, Polyline } from "react-leaflet";
import MarkerClusterGroup from "@changey/react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Location } from "../types/location";
import type { Transportation } from "../types/transportation";
import { Link } from "react-router-dom";
import '../utils/mapUtils';

interface PlacesVisitedMapProps {
    locations: Location[];
    transportation: Transportation[];
}

const PlacesVisitedMap = ({ locations, transportation }: PlacesVisitedMapProps) => {
  return (
    <>
      <MarkerClusterGroup chunkedLoading data-testid="marker-cluster-group">
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
    </>
  );
};

export default PlacesVisitedMap;
