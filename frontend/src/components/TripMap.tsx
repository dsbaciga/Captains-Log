import { useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Transportation, TransportationType } from "../types/transportation";

interface TripMapProps {
  transportations: Transportation[];
  height?: string;
}

// Land and sea transportation types (excluding flights)
const GROUND_TRANSPORT_TYPES: TransportationType[] = [
  "train",
  "bus",
  "car",
  "ferry",
  "bicycle",
  "walk",
  "other",
];

// Get icon based on transportation type
const getTransportationIcon = (type: TransportationType) => {
  const emojiMap: Record<TransportationType, string> = {
    flight: "✈️",
    train: "🚆",
    bus: "🚌",
    car: "🚗",
    ferry: "⛴️",
    bicycle: "🚴",
    walk: "🚶",
    other: "🚗",
  };

  return L.divIcon({
    html: `<div style="font-size: 20px;">${emojiMap[type]}</div>`,
    className: "custom-div-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Get color for route line based on transportation type
const getRouteColor = (type: TransportationType): string => {
  const colorMap: Record<TransportationType, string> = {
    flight: "#3b82f6", // blue (not used but included for type safety)
    train: "#dc2626", // red
    bus: "#16a34a", // green
    car: "#f59e0b", // amber
    ferry: "#0891b2", // cyan
    bicycle: "#8b5cf6", // purple
    walk: "#ec4899", // pink
    other: "#6b7280", // gray
  };
  return colorMap[type];
};

// Calculate bounds for all routes
const calculateBounds = (
  transportations: Transportation[]
): [[number, number], [number, number]] | null => {
  const points: [number, number][] = [];

  transportations.forEach((t) => {
    if (t.route) {
      points.push([t.route.from.latitude, t.route.from.longitude]);
      points.push([t.route.to.latitude, t.route.to.longitude]);
    }
  });

  if (points.length === 0) return null;

  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);

  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
};

export default function TripMap({ transportations, height = "500px" }: TripMapProps) {
  // Filter to only ground/sea transportation with valid routes
  const groundTransportations = useMemo(
    () =>
      transportations.filter(
        (t) =>
          GROUND_TRANSPORT_TYPES.includes(t.type) &&
          t.route &&
          t.route.from.latitude &&
          t.route.from.longitude &&
          t.route.to.latitude &&
          t.route.to.longitude
      ),
    [transportations]
  );

  // Calculate map bounds
  const bounds = useMemo(
    () => calculateBounds(groundTransportations),
    [groundTransportations]
  );

  // Default center if no routes
  const defaultCenter: [number, number] = [40, -95]; // Center of US
  const defaultZoom = 4;

  if (groundTransportations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        <svg
          className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <p className="text-lg font-medium">No ground or sea routes to display</p>
        <p className="text-sm mt-1">
          Add transportation segments (train, bus, car, ferry, etc.) with locations to see them on
          the map.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {GROUND_TRANSPORT_TYPES.filter((type) =>
          groundTransportations.some((t) => t.type === type)
        ).map((type) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className="w-4 h-1 rounded"
              style={{ backgroundColor: getRouteColor(type) }}
            />
            <span className="capitalize text-gray-700 dark:text-gray-300">{type}</span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div
        className="map-container-dynamic rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 w-full relative z-0"
        style={{ "--map-height": height } as React.CSSProperties & { "--map-height": string }}
      >
        <MapContainer
          bounds={bounds || undefined}
          center={bounds ? undefined : defaultCenter}
          zoom={bounds ? undefined : defaultZoom}
          scrollWheelZoom={true}
          className="h-full w-full z-0"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {groundTransportations.map((transportation) => {
            if (!transportation.route) return null;

            const { from, to, geometry } = transportation.route;
            const routeColor = getRouteColor(transportation.type);
            const transportIcon = getTransportationIcon(transportation.type);

            // Use actual route geometry if available, otherwise straight line
            const routePath = geometry
              ? geometry.map(([lon, lat]) => [lat, lon] as [number, number])
              : ([[from.latitude, from.longitude], [to.latitude, to.longitude]] as [number, number][]);

            return (
              <div key={transportation.id}>
                {/* Departure marker */}
                <Marker position={[from.latitude, from.longitude]} icon={transportIcon}>
                  <Popup>
                    <div className="text-sm">
                      <strong>From:</strong> {from.name}
                      {transportation.departureTime && (
                        <div className="text-gray-600">
                          {new Date(transportation.departureTime).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>

                {/* Arrival marker */}
                <Marker position={[to.latitude, to.longitude]} icon={transportIcon}>
                  <Popup>
                    <div className="text-sm">
                      <strong>To:</strong> {to.name}
                      {transportation.arrivalTime && (
                        <div className="text-gray-600">
                          {new Date(transportation.arrivalTime).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>

                {/* Route path */}
                <Polyline
                  positions={routePath}
                  pathOptions={{
                    color: routeColor,
                    weight: 4,
                    opacity: 0.8,
                    dashArray: geometry ? undefined : "8, 8",
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong className="capitalize">{transportation.type}</strong>
                      <div>
                        {from.name} → {to.name}
                      </div>
                      {transportation.carrier && (
                        <div className="text-gray-600">{transportation.carrier}</div>
                      )}
                      {transportation.calculatedDistance && (
                        <div className="text-gray-600">
                          {transportation.calculatedDistance.toFixed(1)} km
                        </div>
                      )}
                    </div>
                  </Popup>
                </Polyline>
              </div>
            );
          })}
        </MapContainer>
      </div>

      {/* Route summary */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {groundTransportations.length} route
        {groundTransportations.length !== 1 ? "s" : ""} (excludes flights)
      </div>
    </div>
  );
}
