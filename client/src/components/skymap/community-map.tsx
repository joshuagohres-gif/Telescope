import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon in React-Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface UserLocation {
  lat: number;
  lng: number;
}

interface CommunityMapProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Component to center map on user's location
 */
function MapController({ userLocation }: { userLocation: UserLocation | null }) {
  const map = useMap();

  useEffect(() => {
    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 4);
    }
  }, [userLocation, map]);

  return null;
}

/**
 * Interactive map component centered on user's geolocation
 * Uses OpenStreetMap tiles for worldwide coverage
 */
export function CommunityMap({ children, className = "" }: CommunityMapProps) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>("Loading...");

  useEffect(() => {
    // Get user's location via browser geolocation API
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);

          // Reverse geocode to get location name
          fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`
          )
            .then((res) => res.json())
            .then((data) => {
              const city = data.address?.city || data.address?.town || data.address?.village;
              const country = data.address?.country;
              if (city && country) {
                setLocationName(`${city}, ${country}`);
              } else if (country) {
                setLocationName(country);
              } else {
                setLocationName("Unknown location");
              }
            })
            .catch(() => {
              setLocationName("Unknown location");
            });
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError(error.message);
          // Default to a world view centered on prime meridian
          setUserLocation({ lat: 20, lng: 0 });
          setLocationName("World");
        }
      );
    } else {
      setLocationError("Geolocation not supported by this browser");
      setUserLocation({ lat: 20, lng: 0 });
      setLocationName("World");
    }
  }, []);

  // Default center while loading location
  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [20, 0];

  return (
    <div className={`relative ${className}`}>
      {locationError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-md shadow-md max-w-md">
          <p className="text-sm">
            <strong>Location access denied:</strong> {locationError}
          </p>
          <p className="text-xs mt-1">Showing world view instead.</p>
        </div>
      )}

      <div className="absolute top-4 left-4 z-[1000] bg-card border border-border px-4 py-2 rounded-md shadow-lg">
        <p className="text-sm font-medium">
          See the sky in <span className="text-primary">{locationName}</span> tonight!
        </p>
      </div>

      <MapContainer
        center={center}
        zoom={4}
        scrollWheelZoom={true}
        className={`w-full h-full rounded-lg ${className}`}
        style={{ minHeight: "500px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && <MapController userLocation={userLocation} />}

        {children}
      </MapContainer>
    </div>
  );
}
