import { Card } from "@/components/ui/card";
import { MapPin, Info } from "lucide-react";

interface LocationPreviewProps {
  photoCount: number;
  timeRange: string;
}

/**
 * Preview card showing current photo count and filter status
 */
export function LocationPreview({ photoCount, timeRange }: LocationPreviewProps) {
  const timeRangeLabels: Record<string, string> = {
    tonight: "tonight",
    week: "this week",
    month: "this month",
    year: "this year",
    all: "all time",
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">
            {photoCount} {photoCount === 1 ? "Photo" : "Photos"} Found
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Showing astrophotography captured {timeRangeLabels[timeRange] || "all time"}
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-muted/50 rounded-md">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Click on map markers to view photo details, equipment info, and capture
            location. Markers cluster together at lower zoom levels for better
            performance.
          </p>
        </div>
      </div>
    </Card>
  );
}
