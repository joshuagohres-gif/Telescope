import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CloudRain, Droplets, Wind, Thermometer, Eye, Moon, AlertTriangle } from "lucide-react";
import { WeatherTimeline } from "./WeatherTimeline";

interface Site {
  id: string;
  name: string;
}

interface MeteoForecast {
  id: number;
  ts: string;
  cloudPct: number;
  transparencyIdx: number | null;
  seeingArcsec: number | null;
  windMps: number;
  gustMps: number | null;
  tempC: number;
  dewpointC: number;
  rhPct: number;
  precipMm: number | null;
  pressureHpa: number | null;
  moonIllum: number;
  moonAltDeg: number;
  source: string;
}

function calculateDewRisk(tempC: number, dewpointC: number): { level: string; color: string; description: string } {
  const dewpointDiff = tempC - dewpointC;

  if (dewpointDiff < 2) {
    return { level: "HIGH", color: "destructive", description: "Dew/frost imminent" };
  } else if (dewpointDiff < 4) {
    return { level: "MODERATE", color: "warning", description: "Dew likely within hour" };
  } else if (dewpointDiff < 6) {
    return { level: "LOW", color: "secondary", description: "Watch conditions" };
  } else {
    return { level: "MINIMAL", color: "default", description: "Safe" };
  }
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function WeatherDashboard() {
  const [selectedSite, setSelectedSite] = useState<string>("");

  // Fetch sites
  const { data: sites } = useQuery<Site[]>({
    queryKey: ["/api/ops/sites"],
    queryFn: async () => {
      const res = await fetch("/api/ops/sites");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch weather forecasts for selected site
  const { data: forecasts, isLoading } = useQuery<MeteoForecast[]>({
    queryKey: ["/api/ops/meteo", selectedSite],
    queryFn: async () => {
      if (!selectedSite) return [];
      const res = await fetch(`/api/ops/sites/${selectedSite}/meteo`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!selectedSite,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Auto-select first site
  useEffect(() => {
    if (sites && sites.length > 0 && !selectedSite) {
      setSelectedSite(sites[0].id);
    }
  }, [sites, selectedSite]);

  // Get current forecast (closest to now)
  const currentForecast = forecasts?.[0];
  const dewRisk = currentForecast
    ? calculateDewRisk(currentForecast.tempC, currentForecast.dewpointC)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudRain className="w-5 h-5" />
          Weather & Seeing Forecast
        </CardTitle>
        <CardDescription>
          Meteorological conditions and dew risk assessment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Site Selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Observatory Site:</label>
          <Select value={selectedSite} onValueChange={setSelectedSite}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a site" />
            </SelectTrigger>
            <SelectContent>
              {sites?.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">Loading forecast...</div>
        )}

        {/* Current Conditions Card */}
        {currentForecast && (
          <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Current Conditions</h3>
              <Badge variant={dewRisk?.color as any}>
                <AlertTriangle className="w-3 h-3 mr-1" />
                Dew Risk: {dewRisk?.level}
              </Badge>
            </div>

            {/* Main Weather Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Thermometer className="w-4 h-4" />
                  Temperature
                </div>
                <div className="text-2xl font-bold">{currentForecast.tempC.toFixed(1)}°C</div>
                <div className="text-xs text-muted-foreground">
                  Dew: {currentForecast.dewpointC.toFixed(1)}°C
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Droplets className="w-4 h-4" />
                  Humidity
                </div>
                <div className="text-2xl font-bold">{currentForecast.rhPct.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">
                  ΔT: {(currentForecast.tempC - currentForecast.dewpointC).toFixed(1)}°C
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wind className="w-4 h-4" />
                  Wind
                </div>
                <div className="text-2xl font-bold">{currentForecast.windMps.toFixed(1)} m/s</div>
                {currentForecast.gustMps && (
                  <div className="text-xs text-muted-foreground">
                    Gust: {currentForecast.gustMps.toFixed(1)} m/s
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CloudRain className="w-4 h-4" />
                  Clouds
                </div>
                <div className="text-2xl font-bold">{currentForecast.cloudPct.toFixed(0)}%</div>
                {currentForecast.transparencyIdx !== null && (
                  <div className="text-xs text-muted-foreground">
                    Trans: {currentForecast.transparencyIdx.toFixed(1)}
                  </div>
                )}
              </div>
            </div>

            {/* Seeing & Moon */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t">
              {currentForecast.seeingArcsec !== null && (
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Seeing: {currentForecast.seeingArcsec.toFixed(1)}"</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Moon: {(currentForecast.moonIllum * 100).toFixed(0)}% @ {currentForecast.moonAltDeg.toFixed(0)}°
                </span>
              </div>
            </div>

            {/* Source */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Source: {currentForecast.source} • Updated: {formatTime(currentForecast.ts)}
            </div>
          </div>
        )}

        {/* Weather Timeline Chart */}
        {forecasts && forecasts.length > 1 && (
          <WeatherTimeline forecasts={forecasts} />
        )}

        {/* Forecast Timeline */}
        {forecasts && forecasts.length > 1 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Hourly Forecast</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {forecasts.slice(0, 12).map((forecast) => {
                const risk = calculateDewRisk(forecast.tempC, forecast.dewpointC);
                return (
                  <div
                    key={forecast.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 text-sm font-mono">{formatTime(forecast.ts)}</div>
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{forecast.tempC.toFixed(1)}°C</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CloudRain className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{forecast.cloudPct.toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wind className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{forecast.windMps.toFixed(1)} m/s</span>
                      </div>
                    </div>
                    <Badge variant={risk.color as any} className="text-xs">
                      {risk.level}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedSite && (!forecasts || forecasts.length === 0) && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <CloudRain className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No weather forecast data available for this site.</p>
            <p className="text-sm">Weather data updates automatically when available.</p>
          </div>
        )}

        {!selectedSite && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Select a site to view weather forecast</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
