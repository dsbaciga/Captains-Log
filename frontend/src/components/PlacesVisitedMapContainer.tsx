import { MapContainer, TileLayer } from "react-leaflet";
import PlacesVisitedMap from "./PlacesVisitedMap";
import type { Location } from "../types/location";
import type { Transportation } from "../types/transportation";

interface PlacesVisitedMapContainerProps {
    locations: Location[];
    transportation: Transportation[];
}

const PlacesVisitedMapContainer = ({ locations, transportation }: PlacesVisitedMapContainerProps) => {
    // Calculate center of all locations
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

    const centerLat =
        validLocations.reduce((sum, loc) => sum + loc.latitude!, 0) /
        validLocations.length;
    const centerLng =
        validLocations.reduce((sum, loc) => sum + loc.longitude!, 0) /
        validLocations.length;
    return (
        <MapContainer
            center={[centerLat || 0, centerLng || 0]}
            zoom={3}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <PlacesVisitedMap locations={locations} transportation={transportation} />
        </MapContainer>
    );
};

export default PlacesVisitedMapContainer;
