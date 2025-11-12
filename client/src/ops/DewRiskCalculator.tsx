import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Droplets,
  Thermometer,
  Wind,
  Zap,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Activity
} from "lucide-react";
import { useDewRisk, useDewProfiles, useDewControlHints, calculateHeaterPWM, getDewRiskInfo } from "@/hooks/use-dew-risk";

interface Site {
  id: string;
  name: string;
}

interface MeteoForecast {
  id: number;
  ts: string;
  tempC: number;
  dewpointC: number;
  rhPct: number;
  windMps: number;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours === 0) return "Now";
  if (diffHours === 1) return "In 1 hour";
  if (diffHours > 0) return `In ${diffHours} hours`;
  return formatTime(isoString);
}

export function DewRiskCalculator() {
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [currentTime] = useState(new Date());

  // Fetch sites
  const { data: sites } = useQuery<Site[]>({
    queryKey: ["/api/ops/sites"],
    queryFn: async () => {
      const res = await fetch("/astrodb/v1/ops/sites");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch weather forecasts for selected site (next 12 hours)
  const { data: forecasts, isLoading } = useQuery<MeteoForecast[]>({
    queryKey: ["/api/ops/meteo/forecast", selectedSite],
    queryFn: async () => {
      if (!selectedSite) return [];

      const now = new Date();
      const twelveHoursLater = new Date(now.getTime() + 12 * 60 * 60 * 1000);

      const params = new URLSearchParams({
        from: now.toISOString(),
        to: twelveHoursLater.toISOString(),
      });

      const res = await fetch(`/astrodb/v1/ops/weather/${selectedSite}?${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!selectedSite,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Fetch dew profiles for learning
  const { data: dewProfiles } = useDewProfiles();

  // Fetch ML control hints
  const { data: controlHints } = useDewControlHints();

  // Auto-select first site
  useEffect(() => {
    if (sites && sites.length > 0 && !selectedSite) {
      setSelectedSite(sites[0].id);
    }
  }, [sites, selectedSite]);

  // Get current forecast
  const currentForecast = forecasts?.[0];

  // Calculate heater recommendation for current conditions
  const heaterRec = currentForecast
    ? calculateHeaterPWM(
        currentForecast.tempC,
        currentForecast.dewpointC,
        currentForecast.rhPct,
        currentForecast.windMps
      )
    : null;

  const dewMargin = currentForecast
    ? currentForecast.tempC - currentForecast.dewpointC
    : 0;

  const dewRiskInfo = getDewRiskInfo(dewMargin);

  // Find worst (highest risk) period in next 12 hours
  const worstPeriod = forecasts?.reduce((worst, curr) => {
    const currMargin = curr.tempC - curr.dewpointC;
    const worstMargin = worst.tempC - worst.dewpointC;
    return currMargin < worstMargin ? curr : worst;
  }, forecasts[0]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="w-5 h-5" />
            Dew Risk Calculator & Heater Control
          </CardTitle>
          <CardDescription>
            Real-time dew point monitoring with intelligent heater power recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* Current Conditions & Recommendation */}
          {currentForecast && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Current Dew Risk */}
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Current Conditions
                    </span>
                    <Badge variant={dewRiskInfo.color as any}>
                      {dewRiskInfo.level}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Thermometer className="w-3 h-3" />
                        Temperature
                      </div>
                      <div className="text-lg font-bold">{currentForecast.tempC.toFixed(1)}°C</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Droplets className="w-3 h-3" />
                        Dew Point
                      </div>
                      <div className="text-lg font-bold">{currentForecast.dewpointC.toFixed(1)}°C</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Humidity</div>
                      <div className="text-lg font-bold">{currentForecast.rhPct.toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Wind className="w-3 h-3" />
                        Wind
                      </div>
                      <div className="text-lg font-bold">{currentForecast.windMps.toFixed(1)} m/s</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-sm font-medium mb-1">Dew Point Margin</div>
                    <div className="text-2xl font-bold text-primary">
                      {dewMargin.toFixed(1)}°C
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {dewRiskInfo.description}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Heater Recommendation */}
              <Card className="border-2 border-primary">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Heater Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Suggested Power</span>
                      <span className="text-2xl font-bold text-primary">{heaterRec?.pwm}%</span>
                    </div>
                    <Progress value={heaterRec?.pwm || 0} className="h-3" />
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-xs font-medium mb-1">Recommendation</div>
                    <div className="text-sm">{heaterRec?.reason}</div>
                  </div>

                  {heaterRec && heaterRec.pwm > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-yellow-900 dark:text-yellow-100">
                        Enable dew heaters now to protect optics from condensation
                      </div>
                    </div>
                  )}

                  <Button className="w-full" size="sm">
                    <Zap className="w-4 h-4 mr-2" />
                    Apply to Connected Heater
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 12-Hour Forecast Timeline */}
          {forecasts && forecasts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  12-Hour Dew Risk Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {forecasts.slice(0, 12).map((forecast, idx) => {
                    const margin = forecast.tempC - forecast.dewpointC;
                    const riskInfo = getDewRiskInfo(margin);
                    const heaterPwm = calculateHeaterPWM(
                      forecast.tempC,
                      forecast.dewpointC,
                      forecast.rhPct,
                      forecast.windMps
                    );

                    return (
                      <div
                        key={forecast.id}
                        className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                          idx === 0 ? "bg-primary/5 border-primary/20" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-24 text-sm font-mono">
                            {formatRelativeTime(forecast.ts)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Thermometer className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{forecast.tempC.toFixed(1)}°C</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Droplets className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{forecast.dewpointC.toFixed(1)}°C</span>
                          </div>
                          <div className="text-sm">
                            ΔT: <span className="font-medium">{margin.toFixed(1)}°C</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Heater</div>
                            <div className="text-sm font-medium">{heaterPwm.pwm}%</div>
                          </div>
                          <Badge variant={riskInfo.color as any} className="w-24 justify-center">
                            {riskInfo.level}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Worst Period Warning */}
                {worstPeriod && (worstPeriod.tempC - worstPeriod.dewpointC) < 3 && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <span className="font-medium">High risk period detected: </span>
                        <span className="text-muted-foreground">
                          {formatTime(worstPeriod.ts)} - Dew margin only {(worstPeriod.tempC - worstPeriod.dewpointC).toFixed(1)}°C
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ML Control Hints */}
          {controlHints && controlHints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Smart Control Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {controlHints.slice(0, 3).map((hint) => (
                    <div
                      key={hint.id}
                      className="p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="text-sm prose dark:prose-invert prose-sm max-w-none">
                        {hint.ruleMd}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dew Profile Learning */}
          {dewProfiles && dewProfiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Historical Heater Profiles</CardTitle>
                <CardDescription>
                  Successful heater settings from past sessions ({dewProfiles.length} profiles)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  System has learned from {dewProfiles.length} previous dew control sessions to improve recommendations
                </div>
              </CardContent>
            </Card>
          )}

          {selectedSite && (!forecasts || forecasts.length === 0) && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Droplets className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No weather forecast data available for this site.</p>
              <p className="text-sm">Dew risk calculations require weather data.</p>
            </div>
          )}

          {!selectedSite && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Select a site to view dew risk forecast</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
