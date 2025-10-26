import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TransportationRoute } from "../types/transportation";

interface FlightRouteMapProps {
  route: TransportationRoute;
  height?: string;
  showLabels?: boolean;
}

// Custom airplane icon for markers
const airplaneIcon = L.divIcon({
  html: '<div style="font-size: 24px;">✈️</div>',
  className: "custom-div-icon",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Calculate intermediate points for curved flight path
const calculateCurvedPath = (
  start: [number, number],
  end: [number, number],
  numPoints: number = 50
): [number, number][] => {
  const points: [number, number][] = [];
  const [lat1, lon1] = start;
  const [lat2, lon2] = end;

  // Calculate the great circle midpoint
  const midLat = (lat1 + lat2) / 2;
  const midLon = (lon1 + lon2) / 2;

  // Calculate the distance for arc height
  const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
  const arcHeight = distance * 0.2; // 20% of distance for arc curvature

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;

    // Linear interpolation
    const lat = lat1 + (lat2 - lat1) * t;
    const lon = lon1 + (lon2 - lon1) * t;

    // Add parabolic curve
    const curvature = 4 * arcHeight * t * (1 - t);
    const curvedLat = lat + curvature;

    points.push([curvedLat, lon]);
  }

  return points;
};

export default function FlightRouteMap({
  route,
  height = "300px",
  showLabels = true,
}: FlightRouteMapProps) {
  const { from, to } = route;

  // Calculate center and zoom
  const centerLat = (from.latitude + to.latitude) / 2;
  const centerLon = (from.longitude + to.longitude) / 2;

  // Calculate zoom level based on distance
  const latDiff = Math.abs(to.latitude - from.latitude);
  const lonDiff = Math.abs(to.longitude - from.longitude);
  const maxDiff = Math.max(latDiff, lonDiff);
  const zoom = maxDiff > 100 ? 2 : maxDiff > 50 ? 3 : maxDiff > 20 ? 4 : maxDiff > 10 ? 5 : 6;

  // Calculate curved path
  const flightPath = calculateCurvedPath(
    [from.latitude, from.longitude],
    [to.latitude, to.longitude]
  );

  return (
    <div style={{ height, width: "100%" }} className="rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Departure marker */}
        <Marker position={[from.latitude, from.longitude]} icon={airplaneIcon}>
          {showLabels && (
            <Popup>
              <div className="text-sm">
                <strong>Departure:</strong> {from.name}
              </div>
            </Popup>
          )}
        </Marker>

        {/* Arrival marker */}
        <Marker position={[to.latitude, to.longitude]} icon={airplaneIcon}>
          {showLabels && (
            <Popup>
              <div className="text-sm">
                <strong>Arrival:</strong> {to.name}
              </div>
            </Popup>
          )}
        </Marker>

        {/* Flight path */}
        <Polyline
          positions={flightPath}
          pathOptions={{
            color: "#3b82f6",
            weight: 3,
            opacity: 0.7,
            dashArray: "10, 10",
          }}
        />
      </MapContainer>
    </div>
  );
}
