import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Globe } from "lucide-react";
import { locationService } from "@/utils/locationService";
import type { LocationData } from "@/utils/locationService";

export function LocationControl() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [cityName, setCityName] = useState("");
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [isLoadingCity, setIsLoadingCity] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current location on mount
  useEffect(() => {
    locationService.getLocation()
      .then(setLocation)
      .catch(() => {
        // Silently fail - user can set location manually
      });
  }, []);

  const handleGetCurrentLocation = async () => {
    setIsLoadingGeo(true);
    setError(null);
    try {
      const loc = await locationService.getCurrentLocation();
      setLocation(loc);
      setManualLat(loc.latitude.toFixed(6));
      setManualLon(loc.longitude.toFixed(6));
    } catch (err) {
      setError("Failed to get current location. Please check browser permissions.");
    } finally {
      setIsLoadingGeo(false);
    }
  };

  const handleSetManualCoordinates = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);

    if (isNaN(lat) || isNaN(lon)) {
      setError("Invalid coordinates. Please enter valid numbers.");
      return;
    }

    if (lat < -90 || lat > 90) {
      setError("Latitude must be between -90 and 90 degrees.");
      return;
    }

    if (lon < -180 || lon > 180) {
      setError("Longitude must be between -180 and 180 degrees.");
      return;
    }

    const newLocation: LocationData = {
      latitude: lat,
      longitude: lon,
      accuracy: 0,
      timestamp: Date.now(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      localTime: new Date(),
      source: 'manual'
    };

    locationService.setManualLocation(newLocation);
    setLocation(newLocation);
    setError(null);
  };

  const handleSearchCity = async () => {
    if (!cityName.trim()) {
      setError("Please enter a city name.");
      return;
    }

    setIsLoadingCity(true);
    setError(null);

    try {
      // Use OpenStreetMap Nominatim API for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`
      );

      if (!response.ok) {
        throw new Error("Failed to search for city");
      }

      const data = await response.json();

      if (data.length === 0) {
        setError(`City "${cityName}" not found. Please try a different search.`);
        return;
      }

      const result = data[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);

      const newLocation: LocationData = {
        latitude: lat,
        longitude: lon,
        accuracy: 0,
        timestamp: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        localTime: new Date(),
        source: 'manual'
      };

      locationService.setManualLocation(newLocation);
      setLocation(newLocation);
      setManualLat(lat.toFixed(6));
      setManualLon(lon.toFixed(6));
      setError(null);
    } catch (err) {
      setError("Failed to search for city. Please try again.");
    } finally {
      setIsLoadingCity(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Location Display */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="font-medium">Current Observer Location</h3>
            </div>
            {location ? (
              <div className="space-y-1 text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">Latitude:</span>
                  <span className="font-mono font-medium">{location.latitude.toFixed(6)}°</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">Longitude:</span>
                  <span className="font-mono font-medium">{location.longitude.toFixed(6)}°</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">Timezone:</span>
                  <span className="font-mono text-xs">{location.timezone}</span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Source: {location.source === 'manual' ? 'Manual' : location.source === 'browser' ? 'Browser GPS' : 'IP Geolocation'}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No location set</p>
            )}
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 bg-destructive/10 border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      {/* Location Input Methods */}
      <Tabs defaultValue="gps" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gps">
            <Navigation className="w-4 h-4 mr-2" />
            GPS
          </TabsTrigger>
          <TabsTrigger value="coordinates">
            <MapPin className="w-4 h-4 mr-2" />
            Coordinates
          </TabsTrigger>
          <TabsTrigger value="city">
            <Globe className="w-4 h-4 mr-2" />
            City Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gps" className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use your device's GPS to automatically detect your current location.
              You may need to grant location permissions to your browser.
            </p>
            <Button
              onClick={handleGetCurrentLocation}
              disabled={isLoadingGeo}
              className="w-full"
            >
              {isLoadingGeo ? "Getting Location..." : "Get Current Location"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="coordinates" className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Manually enter your observing location's geographic coordinates.
            </p>
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude (degrees)</Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                min="-90"
                max="90"
                placeholder="37.7749"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Range: -90° (South) to +90° (North)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude (degrees)</Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                min="-180"
                max="180"
                placeholder="-122.4194"
                value={manualLon}
                onChange={(e) => setManualLon(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Range: -180° (West) to +180° (East)
              </p>
            </div>
            <Button onClick={handleSetManualCoordinates} className="w-full">
              Set Location
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="city" className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Search for your city or observing location by name.
            </p>
            <div className="space-y-2">
              <Label htmlFor="citySearch">City or Location Name</Label>
              <Input
                id="citySearch"
                type="text"
                placeholder="San Francisco, CA"
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchCity()}
              />
              <p className="text-xs text-muted-foreground">
                Examples: "Berkeley, CA", "London, UK", "Tokyo"
              </p>
            </div>
            <Button
              onClick={handleSearchCity}
              disabled={isLoadingCity}
              className="w-full"
            >
              {isLoadingCity ? "Searching..." : "Search"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Location Presets */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">Quick Presets</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newLocation: LocationData = {
                latitude: 37.7749,
                longitude: -122.4194,
                accuracy: 0,
                timestamp: Date.now(),
                timezone: 'America/Los_Angeles',
                localTime: new Date(),
                source: 'manual'
              };
              locationService.setManualLocation(newLocation);
              setLocation(newLocation);
              setManualLat("37.7749");
              setManualLon("-122.4194");
              setError(null);
            }}
          >
            San Francisco
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newLocation: LocationData = {
                latitude: 51.5074,
                longitude: -0.1278,
                accuracy: 0,
                timestamp: Date.now(),
                timezone: 'Europe/London',
                localTime: new Date(),
                source: 'manual'
              };
              locationService.setManualLocation(newLocation);
              setLocation(newLocation);
              setManualLat("51.5074");
              setManualLon("-0.1278");
              setError(null);
            }}
          >
            London
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newLocation: LocationData = {
                latitude: 35.6828,
                longitude: 139.7595,
                accuracy: 0,
                timestamp: Date.now(),
                timezone: 'Asia/Tokyo',
                localTime: new Date(),
                source: 'manual'
              };
              locationService.setManualLocation(newLocation);
              setLocation(newLocation);
              setManualLat("35.6828");
              setManualLon("139.7595");
              setError(null);
            }}
          >
            Tokyo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newLocation: LocationData = {
                latitude: -33.8651,
                longitude: 151.2095,
                accuracy: 0,
                timestamp: Date.now(),
                timezone: 'Australia/Sydney',
                localTime: new Date(),
                source: 'manual'
              };
              locationService.setManualLocation(newLocation);
              setLocation(newLocation);
              setManualLat("-33.8651");
              setManualLon("151.2095");
              setError(null);
            }}
          >
            Sydney
          </Button>
        </div>
      </Card>
    </div>
  );
}
