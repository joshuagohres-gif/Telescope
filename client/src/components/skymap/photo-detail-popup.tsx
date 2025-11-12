import { Badge } from "@/components/ui/badge";
import { Calendar, Camera, MapPin, Telescope } from "lucide-react";
import type { SkyMapPhoto } from "./photo-markers";

interface PhotoDetailPopupProps {
  photo: SkyMapPhoto;
}

const LOCATION_PRECISION_LABELS = {
  exact: "Exact location",
  city: "City-level precision",
  region: "Region-level precision",
  country: "Country-level precision",
};

/**
 * Photo detail popup shown when clicking a marker
 * Displays photo metadata, equipment info, and tags
 */
export function PhotoDetailPopup({ photo }: PhotoDetailPopupProps) {
  const captureDate = new Date(photo.captureDate);
  const formattedDate = captureDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-3 min-w-[300px] max-w-[400px]">
      {/* Photo Image */}
      <div className="relative w-full h-48 bg-muted rounded-md overflow-hidden">
        <img
          src={photo.imageUrl}
          alt={photo.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Title */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">{photo.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{photo.description}</p>
      </div>

      {/* Capture Date */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span>Captured: {formattedDate}</span>
      </div>

      {/* Location Precision */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4" />
        <span>{LOCATION_PRECISION_LABELS[photo.locationPrecision]}</span>
      </div>

      {/* Equipment */}
      {photo.equipment && (
        <div className="border-t border-border pt-3 mt-1">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
            Equipment
          </p>
          <div className="flex flex-col gap-1">
            {photo.equipment.camera && (
              <div className="flex items-center gap-2 text-sm">
                <Camera className="w-4 h-4 text-muted-foreground" />
                <span>{photo.equipment.camera}</span>
              </div>
            )}
            {photo.equipment.telescope && (
              <div className="flex items-center gap-2 text-sm">
                <Telescope className="w-4 h-4 text-muted-foreground" />
                <span>{photo.equipment.telescope}</span>
              </div>
            )}
            {photo.equipment.mount && (
              <div className="flex items-center gap-2 text-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground"
                >
                  <path d="M12 2v20" />
                  <path d="M8 6l4-4 4 4" />
                  <path d="M8 18l4 4 4-4" />
                </svg>
                <span>{photo.equipment.mount}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {photo.tags.length > 0 && (
        <div className="border-t border-border pt-3 mt-1">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {photo.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
