/**
 * Tonight's Targets UI Component
 * Displays interactive list of visible celestial objects for tonight
 * with hourly alt/az positions and peak altitude times
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { locationService, type LocationData } from "@/utils/locationService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Star, TrendingUp, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShowpieceData {
  name: string;
  class: string;
  ra: number;
  dec: number;
  mag: number;
  hourly: Array<{ time: string; alt: number; az: number }>;
  peak_alt_deg: number;
}

interface ApiResponse {
  data: ShowpieceData[];
  version: string;
  generated_at: string;
}

const OBJECT_CLASSES = [
  "all",
  "star",
  "galaxy",
  "nebula",
  "cluster",
  "planet",
  "asterism",
] as const;

export function TonightsTargets() {
  const { toast } = useToast();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [minAltitude, setMinAltitude] = useState(20);
  const [objectClass, setObjectClass] = useState<string>("all");
  const [isEnabled, setIsEnabled] = useState(false);

  // Check feature flag
  useEffect(() => {
    fetch("/astrodb/v1/targets/tonight?lat=0&lon=0&from=2024-01-01T00:00:00Z&to=2024-01-01T01:00:00Z")
      .then((res) => {
        setIsEnabled(res.status !== 404);
      })
      .catch(() => setIsEnabled(false));
  }, []);

  // Get observer location
  useEffect(() => {
    locationService
      .getLocation()
      .then((loc) => {
        setLocation(loc);
      })
      .catch((err) => {
        console.error("Failed to get location:", err);
        toast({
          title: "Location Error",
          description: "Using default location (San Francisco)",
          variant: "default",
        });
        // Fallback to default location
        setLocation({
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 0,
          timestamp: Date.now(),
          timezone: "America/Los_Angeles",
          localTime: new Date(),
          source: "manual",
        });
      });
  }, [toast]);

  // Calculate tonight's time window (sunset to sunrise, roughly 6 PM to 6 AM local)
  const getTonightWindow = () => {
    const now = new Date();
    const from = new Date(now);
    from.setHours(18, 0, 0, 0); // 6 PM today
    if (from < now) {
      from.setDate(from.getDate() + 1); // If past 6 PM, use tomorrow
    }
    const to = new Date(from);
    to.setHours(to.getHours() + 12); // 12 hours later (6 AM next day)

    return { from, to };
  };

  const { from, to } = getTonightWindow();

  // Fetch tonight's showpieces
  const { data, isLoading, error, refetch } = useQuery<ApiResponse>({
    queryKey: [
      "/astrodb/v1/targets/tonight",
      location?.latitude,
      location?.longitude,
      from.toISOString(),
      to.toISOString(),
    ],
    queryFn: async () => {
      if (!location) throw new Error("Location not available");

      const params = new URLSearchParams({
        lat: location.latitude.toString(),
        lon: location.longitude.toString(),
        from: from.toISOString(),
        to: to.toISOString(),
        step: "60m",
      });

      const response = await fetch(`/astrodb/v1/targets/tonight?${params}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!location && isEnabled,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  // Filter and sort data
  const filteredData = data?.data
    ?.filter((obj) => {
      if (objectClass !== "all" && obj.class !== objectClass) return false;
      if (obj.peak_alt_deg < minAltitude) return false;
      return true;
    })
    .sort((a, b) => b.peak_alt_deg - a.peak_alt_deg) || [];

  // Format time for display
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Format magnitude
  const formatMag = (mag: number) => {
    return mag < 99 ? mag.toFixed(1) : "N/A";
  };

  if (!isEnabled) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Targets Pack is not enabled. Set ASTRO_TARGETS_ENABLED=true to use this feature.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Star className="w-5 h-5" />
              Tonight's Targets
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Visible celestial objects for {from.toLocaleDateString()} evening
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="object-class">Object Class</Label>
            <Select value={objectClass} onValueChange={setObjectClass}>
              <SelectTrigger id="object-class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OBJECT_CLASSES.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls === "all" ? "All Classes" : cls.charAt(0).toUpperCase() + cls.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="min-altitude">Min Altitude (°)</Label>
            <Input
              id="min-altitude"
              type="number"
              min="0"
              max="90"
              value={minAltitude}
              onChange={(e) => setMinAltitude(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load targets: {error instanceof Error ? error.message : "Unknown error"}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && (
          <>
            <div className="text-sm text-muted-foreground">
              Found {filteredData.length} visible object{filteredData.length !== 1 ? "s" : ""}
            </div>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {filteredData.map((obj, idx) => (
                  <Card key={idx} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{obj.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{obj.class}</Badge>
                          <Badge variant="secondary">Mag {formatMag(obj.mag)}</Badge>
                          <Badge variant="default" className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Peak: {obj.peak_alt_deg.toFixed(1)}°
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    {/* Hourly positions */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Hourly Positions</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                        {obj.hourly.slice(0, 12).map((pos, i) => (
                          <div
                            key={i}
                            className="p-2 rounded border bg-muted/50"
                          >
                            <div className="font-medium">{formatTime(pos.time)}</div>
                            <div className="text-muted-foreground">
                              Alt: {pos.alt.toFixed(1)}° | Az: {pos.az.toFixed(1)}°
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
                {filteredData.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No objects match the selected filters.
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
}
