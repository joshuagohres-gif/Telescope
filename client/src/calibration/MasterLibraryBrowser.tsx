import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Grid3x3, List, Calendar, Camera, Thermometer, Clock } from "lucide-react";

interface CalibrationFrame {
  id: string;
  frameType: string; // "BIAS", "DARK", "FLAT"
  binning: string;
  temperature?: number;
  exposureTime?: number;
  filter?: string;
  dateCreated: string;
  frameCount: number;
  qualityScore?: number;
}

interface MasterLibraryResponse {
  frames: CalibrationFrame[];
}

export function MasterLibraryBrowser() {
  const [frameType, setFrameType] = useState<string>("all");
  const [binning, setBinning] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data, isLoading, error } = useQuery<MasterLibraryResponse>({
    queryKey: ["/api/calibration/masters", frameType, binning],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (frameType !== "all") params.append("frame_type", frameType);
      if (binning !== "all") params.append("binning", binning);

      const res = await fetch(`/astrodb/v1/calibration/masters?${params}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch master library");
      }
      const json = await res.json();
      return json.data;
    },
  });

  function getFrameTypeColor(type: string): string {
    switch (type.toUpperCase()) {
      case "BIAS":
        return "bg-blue-500";
      case "DARK":
        return "bg-purple-500";
      case "FLAT":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  }

  function getQualityLevel(score?: number): { label: string; color: string } {
    if (!score) return { label: "Unknown", color: "bg-gray-500" };
    if (score >= 0.9) return { label: "Excellent", color: "bg-green-500" };
    if (score >= 0.7) return { label: "Good", color: "bg-blue-500" };
    if (score >= 0.5) return { label: "Fair", color: "bg-yellow-500" };
    return { label: "Poor", color: "bg-red-500" };
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Master Calibration Library</h2>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="frame-type">Frame Type</Label>
            <Select value={frameType} onValueChange={setFrameType}>
              <SelectTrigger id="frame-type">
                <SelectValue placeholder="Select frame type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="BIAS">Bias</SelectItem>
                <SelectItem value="DARK">Dark</SelectItem>
                <SelectItem value="FLAT">Flat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="binning">Binning</Label>
            <Select value={binning} onValueChange={setBinning}>
              <SelectTrigger id="binning">
                <SelectValue placeholder="Select binning" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Binnings</SelectItem>
                <SelectItem value="1x1">1x1</SelectItem>
                <SelectItem value="2x2">2x2</SelectItem>
                <SelectItem value="3x3">3x3</SelectItem>
                <SelectItem value="4x4">4x4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            Loading master calibration library...
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-destructive">
            Error: {error instanceof Error ? error.message : "Failed to load library"}
          </div>
        )}

        {data && data.frames.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No calibration frames found matching the selected filters.
          </div>
        )}

        {data && data.frames.length > 0 && (
          <>
            <div className="text-sm text-muted-foreground">
              Found {data.frames.length} calibration frame{data.frames.length !== 1 ? "s" : ""}
            </div>

            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.frames.map((frame) => {
                  const quality = getQualityLevel(frame.qualityScore);
                  return (
                    <Card key={frame.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge className={getFrameTypeColor(frame.frameType)}>
                          {frame.frameType}
                        </Badge>
                        <Badge className={quality.color}>{quality.label}</Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-muted-foreground" />
                          <span>Binning: {frame.binning}</span>
                        </div>

                        {frame.temperature !== undefined && (
                          <div className="flex items-center gap-2">
                            <Thermometer className="w-4 h-4 text-muted-foreground" />
                            <span>Temp: {frame.temperature}°C</span>
                          </div>
                        )}

                        {frame.exposureTime !== undefined && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>Exposure: {frame.exposureTime}s</span>
                          </div>
                        )}

                        {frame.filter && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Filter:</span>
                            <span>{frame.filter}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{new Date(frame.dateCreated).toLocaleDateString()}</span>
                        </div>

                        <div className="pt-2 border-t">
                          <span className="font-medium">{frame.frameCount} frames</span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {data.frames.map((frame) => {
                  const quality = getQualityLevel(frame.qualityScore);
                  return (
                    <Card key={frame.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge className={getFrameTypeColor(frame.frameType)}>
                            {frame.frameType}
                          </Badge>
                          <span className="font-medium">Binning: {frame.binning}</span>
                          {frame.temperature !== undefined && (
                            <span className="text-sm text-muted-foreground">
                              {frame.temperature}°C
                            </span>
                          )}
                          {frame.exposureTime !== undefined && (
                            <span className="text-sm text-muted-foreground">
                              {frame.exposureTime}s
                            </span>
                          )}
                          {frame.filter && (
                            <span className="text-sm text-muted-foreground">
                              Filter: {frame.filter}
                            </span>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {new Date(frame.dateCreated).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">{frame.frameCount} frames</span>
                          <Badge className={quality.color}>{quality.label}</Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
