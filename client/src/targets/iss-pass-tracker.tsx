/**
 * ISS Pass Tracker Component
 * Timeline view of upcoming ISS passes with visibility badges
 * and countdown timer to next pass
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { locationService, type LocationData } from "@/utils/locationService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Satellite, Clock, TrendingUp, Sun, Moon, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PassData {
  start: string;
  peak: string;
  end: string;
  max_el_deg: number;
  az_start: number;
  az_peak: number;
}

interface ApiResponse {
  data: PassData[];
  version: string;
  generated_at: string;
}

const ISS_NORAD_ID = 25544; // International Space Station

export function IssPassTracker() {
  const { toast } = useToast();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check feature flag
  useEffect(() => {
    fetch("/astrodb/v1/targets/passes?norad_id=25544&lat=0&lon=0&from=2024-01-01T00:00:00Z&to=2024-01-01T01:00:00Z")
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

  // Calculate time window (next 12 hours)
  const getTimeWindow = () => {
    const from = new Date(currentTime);
    const to = new Date(from);
    to.setHours(to.getHours() + 12);
    return { from, to };
  };

  const { from, to } = getTimeWindow();

  // Fetch ISS passes
  const { data, isLoading, error, refetch } = useQuery<ApiResponse>({
    queryKey: [
      "/astrodb/v1/targets/passes",
      ISS_NORAD_ID,
      location?.latitude,
      location?.longitude,
      from.toISOString(),
      to.toISOString(),
    ],
    queryFn: async () => {
      if (!location) throw new Error("Location not available");

      const params = new URLSearchParams({
        norad_id: ISS_NORAD_ID.toString(),
        lat: location.latitude.toString(),
        lon: location.longitude.toString(),
        alt_m: "0",
        from: from.toISOString(),
        to: to.toISOString(),
      });

      const response = await fetch(`/astrodb/v1/targets/passes?${params}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!location && isEnabled,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const passes = data?.data || [];

  // Find next pass
  const nextPass = passes.find((pass) => new Date(pass.start) > currentTime);

  // Calculate countdown to next pass
  const getCountdown = (targetTime: Date): string => {
    const diff = targetTime.getTime() - currentTime.getTime();
    if (diff <= 0) return "Now";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Format time
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format duration
  const formatDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = (endDate.getTime() - startDate.getTime()) / 1000 / 60; // minutes
    return `${Math.round(diff)} min`;
  };

  // Determine visibility badge
  const getVisibilityBadge = (pass: PassData) => {
    const peakDate = new Date(pass.peak);
    const hour = peakDate.getHours();
    const isDaytime = hour >= 6 && hour < 20;
    const isTwilight = (hour >= 5 && hour < 6) || (hour >= 20 && hour < 21);

    if (isDaytime) {
      return { icon: Sun, label: "Daylight", variant: "default" as const };
    } else if (isTwilight) {
      return { icon: Moon, label: "Twilight", variant: "secondary" as const };
    } else {
      return { icon: Moon, label: "Dark", variant: "outline" as const };
    }
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
              <Satellite className="w-5 h-5" />
              ISS Pass Tracker
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upcoming passes in the next 12 hours
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
        {/* Next Pass Countdown */}
        {nextPass && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Next Pass</div>
                  <div className="text-2xl font-bold">{formatTime(nextPass.start)}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Max elevation: {nextPass.max_el_deg.toFixed(1)}° | Duration: {formatDuration(nextPass.start, nextPass.end)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1">Time until pass</div>
                  <div className="text-2xl font-mono font-bold flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {getCountdown(new Date(nextPass.start))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load ISS passes: {error instanceof Error ? error.message : "Unknown error"}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {/* Passes Timeline */}
        {!isLoading && !error && (
          <>
            <div className="text-sm text-muted-foreground">
              {passes.length} pass{passes.length !== 1 ? "es" : ""} found
            </div>
            <div className="space-y-4">
              {passes.map((pass, idx) => {
                const badge = getVisibilityBadge(pass);
                const BadgeIcon = badge.icon;
                const isUpcoming = new Date(pass.start) > currentTime;
                const isActive = new Date(pass.start) <= currentTime && new Date(pass.end) >= currentTime;

                return (
                  <Card key={idx} className={isActive ? "border-primary bg-primary/5" : ""}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">
                              {isActive ? "🛰️ Passing Now" : isUpcoming ? "Upcoming" : "Past"}
                            </h3>
                            <Badge variant={badge.variant} className="flex items-center gap-1">
                              <BadgeIcon className="w-3 h-3" />
                              {badge.label}
                            </Badge>
                            <Badge variant="default" className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {pass.max_el_deg.toFixed(1)}° max
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Rise</div>
                              <div className="font-medium">{formatTime(pass.start)}</div>
                              <div className="text-xs text-muted-foreground">Az: {pass.az_start.toFixed(1)}°</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Peak</div>
                              <div className="font-medium">{formatTime(pass.peak)}</div>
                              <div className="text-xs text-muted-foreground">Az: {pass.az_peak.toFixed(1)}°</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Set</div>
                              <div className="font-medium">{formatTime(pass.end)}</div>
                              <div className="text-xs text-muted-foreground">Duration: {formatDuration(pass.start, pass.end)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {passes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No ISS passes found in the next 12 hours.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
