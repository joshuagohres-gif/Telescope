import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { Camera } from "lucide-react";
import { PhotoDetailPopup } from "./photo-detail-popup";

export interface SkyMapPhoto {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  displayLatitude: number;
  displayLongitude: number;
  locationPrecision: "exact" | "city" | "region" | "country";
  captureDate: string;
  uploadDate: string;
  tags: string[];
  equipment?: {
    camera?: string;
    telescope?: string;
    mount?: string;
  };
}

interface PhotoMarkersProps {
  photos: SkyMapPhoto[];
}

// Custom marker icon for astrophotography photos
const createCustomIcon = () => {
  return L.divIcon({
    className: "custom-marker-icon",
    html: `
      <div class="flex items-center justify-center w-8 h-8 bg-primary rounded-full border-2 border-white shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
          <circle cx="12" cy="13" r="3"></circle>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

/**
 * Renders clustered photo markers on the map
 * Uses MarkerClusterGroup for performance with many markers
 */
export function PhotoMarkers({ photos }: PhotoMarkersProps) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={50}
      spiderfyOnMaxZoom={true}
      showCoverageOnHover={false}
      zoomToBoundsOnClick={true}
      iconCreateFunction={(cluster) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? "small" : count < 50 ? "medium" : "large";
        const sizeClass =
          size === "small"
            ? "w-10 h-10 text-sm"
            : size === "medium"
            ? "w-12 h-12 text-base"
            : "w-14 h-14 text-lg";

        return L.divIcon({
          html: `
            <div class="flex items-center justify-center ${sizeClass} bg-primary rounded-full border-4 border-white shadow-xl text-white font-bold">
              ${count}
            </div>
          `,
          className: "custom-cluster-icon",
          iconSize: L.point(40, 40, true),
        });
      }}
    >
      {photos.map((photo) => (
        <Marker
          key={photo.id}
          position={[photo.displayLatitude, photo.displayLongitude]}
          icon={createCustomIcon()}
        >
          <Popup maxWidth={400} className="photo-popup">
            <PhotoDetailPopup photo={photo} />
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
}
