import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { CommunityMap } from "@/components/skymap/community-map";
import { PhotoMarkers, type SkyMapPhoto } from "@/components/skymap/photo-markers";
import { TimeRangeFilter, type TimeRange } from "@/components/skymap/time-range-filter";
import { LocationPreview } from "@/components/skymap/location-preview";

export default function SkyMapPage() {
  const [, navigate] = useLocation();
  const [photos, setPhotos] = useState<SkyMapPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  useEffect(() => {
    async function fetchPhotos() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (timeRange !== "all") {
          params.set("time_range", timeRange);
        }

        const response = await fetch(`/astrodb/v1/skymap/photos?${params}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              "Community Sky Map feature is not enabled. Please check your environment configuration."
            );
          }
          throw new Error(`Failed to fetch photos: ${response.statusText}`);
        }

        const result = await response.json();
        setPhotos(result.data || []);
      } catch (err: any) {
        console.error("Error fetching skymap photos:", err);
        setError(err.message || "Failed to load photos");
      } finally {
        setLoading(false);
      }
    }

    fetchPhotos();
  }, [timeRange]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Community Sky Map</h1>
              <p className="text-sm text-muted-foreground">
                Explore astrophotography from around the world
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar: Filters & Info */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <Card className="p-4">
              <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
            </Card>

            {!loading && !error && (
              <LocationPreview photoCount={photos.length} timeRange={timeRange} />
            )}
          </div>

          {/* Main Map */}
          <div className="lg:col-span-9">
            <Card className="p-0 overflow-hidden" style={{ minHeight: "600px" }}>
              {loading && (
                <div className="flex flex-col items-center justify-center h-[600px] gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading sky map...</p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center h-[600px] gap-4 p-8">
                  <AlertCircle className="w-12 h-12 text-destructive" />
                  <div className="text-center max-w-md">
                    <p className="text-lg font-semibold text-destructive">
                      Failed to Load
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">{error}</p>
                  </div>
                  <Button onClick={() => window.location.reload()} variant="outline">
                    Try Again
                  </Button>
                </div>
              )}

              {!loading && !error && (
                <CommunityMap className="h-[600px]">
                  <PhotoMarkers photos={photos} />
                </CommunityMap>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
