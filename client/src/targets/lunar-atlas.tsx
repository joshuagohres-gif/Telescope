/**
 * Lunar Atlas Component
 * Searchable map/list of lunar surface features with radius search
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
import { Moon, Search, MapPin, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FeatureData {
  id: number;
  body: string;
  name: string;
  featureType: string;
  lat: number | null;
  lon: number | null;
  diameterKm: number | null;
}

interface ApiResponse {
  data: FeatureData[];
  version: string;
  generated_at: string;
}

const FEATURE_TYPES = [
  "all",
  "crater",
  "mare",
  "mountain",
  "ridge",
  "valley",
  "rille",
  "dome",
] as const;

export function LunarAtlas() {
  const { toast } = useToast();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [searchMode, setSearchMode] = useState<"radius" | "name">("radius");
  const [radiusKm, setRadiusKm] = useState(200);
  const [searchLat, setSearchLat] = useState("");
  const [searchLon, setSearchLon] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [featureType, setFeatureType] = useState<string>("all");
  const [isEnabled, setIsEnabled] = useState(false);

  // Check feature flag
  useEffect(() => {
    fetch("/astrodb/v1/targets/features?body=Moon")
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
        // Pre-fill search coordinates with observer location
        setSearchLat(loc.latitude.toFixed(4));
        setSearchLon(loc.longitude.toFixed(4));
      })
      .catch((err) => {
        console.error("Failed to get location:", err);
        toast({
          title: "Location Error",
          description: "Using default location (San Francisco)",
          variant: "default",
        });
        const defaultLoc = {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 0,
          timestamp: Date.now(),
          timezone: "America/Los_Angeles",
          localTime: new Date(),
          source: "manual" as const,
        };
        setLocation(defaultLoc);
        setSearchLat(defaultLoc.latitude.toFixed(4));
        setSearchLon(defaultLoc.longitude.toFixed(4));
      });
  }, [toast]);

  // Fetch lunar features
  const { data, isLoading, error, refetch } = useQuery<ApiResponse>({
    queryKey: [
      "/astrodb/v1/targets/features",
      searchMode,
      searchMode === "radius" ? searchLat : nameQuery,
      searchMode === "radius" ? searchLon : undefined,
      searchMode === "radius" ? radiusKm : undefined,
      featureType,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        body: "Moon",
      });

      if (searchMode === "radius") {
        const lat = parseFloat(searchLat);
        const lon = parseFloat(searchLon);
        if (isNaN(lat) || isNaN(lon)) {
          throw new Error("Invalid latitude/longitude");
        }
        params.append("near", `${lat},${lon}`);
        params.append("radius_km", radiusKm.toString());
      } else {
        if (!nameQuery.trim()) {
          throw new Error("Name query is required");
        }
        params.append("name", nameQuery);
      }

      if (featureType !== "all") {
        params.append("feature_type", featureType);
      }

      const response = await fetch(`/astrodb/v1/targets/features?${params}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: isEnabled && (searchMode === "name" ? !!nameQuery.trim() : !!(searchLat && searchLon)),
  });

  const features = data?.data || [];

  // Filter by feature type (client-side for name search)
  const filteredFeatures =
    searchMode === "name" && featureType !== "all"
      ? features.filter((f) => f.featureType === featureType)
      : features;

  const handleSearch = () => {
    refetch();
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
              <Moon className="w-5 h-5" />
              Lunar Atlas
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Search lunar surface features by location or name
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
        {/* Search Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={searchMode === "radius" ? "default" : "outline"}
            size="sm"
            onClick={() => setSearchMode("radius")}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Radius Search
          </Button>
          <Button
            variant={searchMode === "name" ? "default" : "outline"}
            size="sm"
            onClick={() => setSearchMode("name")}
          >
            <Search className="w-4 h-4 mr-2" />
            Name Search
          </Button>
        </div>

        {/* Search Controls */}
        {searchMode === "radius" ? (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search-lat">Latitude (°)</Label>
              <Input
                id="search-lat"
                type="number"
                step="0.0001"
                value={searchLat}
                onChange={(e) => setSearchLat(e.target.value)}
                placeholder="e.g., 51.6"
              />
            </div>
            <div>
              <Label htmlFor="search-lon">Longitude (°)</Label>
              <Input
                id="search-lon"
                type="number"
                step="0.0001"
                value={searchLon}
                onChange={(e) => setSearchLon(e.target.value)}
                placeholder="e.g., -9.4"
              />
            </div>
            <div>
              <Label htmlFor="radius">Radius (km)</Label>
              <Input
                id="radius"
                type="number"
                min="1"
                max="1000"
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseInt(e.target.value) || 200)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} className="w-full" disabled={isLoading}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="name-query">Feature Name</Label>
              <Input
                id="name-query"
                type="text"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder="e.g., Tycho, Copernicus"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} className="w-full" disabled={isLoading || !nameQuery.trim()}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        )}

        {/* Feature Type Filter */}
        <div>
          <Label htmlFor="feature-type">Feature Type</Label>
          <Select value={featureType} onValueChange={setFeatureType}>
            <SelectTrigger id="feature-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FEATURE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === "all" ? "All Types" : type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load features: {error instanceof Error ? error.message : "Unknown error"}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && (
          <>
            <div className="text-sm text-muted-foreground">
              Found {filteredFeatures.length} feature{filteredFeatures.length !== 1 ? "s" : ""}
            </div>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredFeatures.map((feature) => (
                  <Card key={feature.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{feature.name}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{feature.featureType}</Badge>
                          {feature.diameterKm && (
                            <Badge variant="secondary">
                              {feature.diameterKm.toFixed(1)} km
                            </Badge>
                          )}
                          {feature.lat !== null && feature.lon !== null && (
                            <Badge variant="default" className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {feature.lat.toFixed(2)}°, {feature.lon.toFixed(2)}°
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                {filteredFeatures.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                  No features found matching your search criteria.
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
