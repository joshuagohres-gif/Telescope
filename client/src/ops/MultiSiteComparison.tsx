import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MapPin, TrendingUp, CloudRain, Eye, Droplets, Trophy } from "lucide-react";
import { scoreNightQuality, type ObservingConditions } from "./NightQualityScorer";

interface Site {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevM: number;
}

interface MeteoForecast {
  id: number;
  ts: string;
  cloudPct: number;
  transparencyIdx: number | null;
  seeingArcsec: number | null;
  windMps: number;
  tempC: number;
  dewpointC: number;
  rhPct: number;
  moonIllum: number;
  moonAltDeg: number;
}

interface SiteScore {
  siteId: string;
  siteName: string;
  avgScore: number;
  bestHourScore: number;
  grade: string;
  warnings: string[];
  conditions: ObservingConditions[];
}

export function MultiSiteComparison() {
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [targetType, setTargetType] = useState<"deep_sky" | "planetary" | "lunar" | "solar">("deep_sky");
  const [timeRange] = useState({ hours: 12 }); // Next 12 hours

  // Fetch all sites
  const { data: sites } = useQuery<Site[]>({
    queryKey: ["/api/ops/sites"],
    queryFn: async () => {
      const res = await fetch("/astrodb/v1/ops/sites");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Auto-select first 3 sites
  useEffect(() => {
    if (sites && sites.length > 0 && selectedSites.size === 0) {
      const firstThree = sites.slice(0, Math.min(3, sites.length)).map(s => s.id);
      setSelectedSites(new Set(firstThree));
    }
  }, [sites, selectedSites.size]);

  // Fetch forecasts for each selected site
  const siteForecasts = useQuery<Map<string, MeteoForecast[]>>({
    queryKey: ["/api/ops/multi-site-forecasts", Array.from(selectedSites)],
    queryFn: async () => {
      const forecastMap = new Map<string, MeteoForecast[]>();

      await Promise.all(
        Array.from(selectedSites).map(async (siteId) => {
          try {
            const now = new Date();
            const end = new Date(now.getTime() + timeRange.hours * 60 * 60 * 1000);

            const params = new URLSearchParams({
              from: now.toISOString(),
              to: end.toISOString(),
            });

            const res = await fetch(`/astrodb/v1/ops/weather/${siteId}?${params}`);
            if (res.ok) {
              const json = await res.json();
              forecastMap.set(siteId, json.data || []);
            }
          } catch (error) {
            console.error(`Failed to fetch forecast for site ${siteId}:`, error);
          }
        })
      );

      return forecastMap;
    },
    enabled: selectedSites.size > 0,
    refetchInterval: 300000, // 5 minutes
  });

  // Calculate scores for each site
  const siteScores: SiteScore[] = [];

  if (siteForecasts.data && sites) {
    Array.from(selectedSites).forEach((siteId) => {
      const site = sites.find(s => s.id === siteId);
      const forecasts = siteForecasts.data?.get(siteId) || [];

      if (site && forecasts.length > 0) {
        const conditions: ObservingConditions[] = forecasts.map(f => ({
          cloudPct: f.cloudPct,
          transparencyIdx: f.transparencyIdx ?? undefined,
          seeingArcsec: f.seeingArcsec ?? undefined,
          windMps: f.windMps,
          dewMarginC: f.tempC - f.dewpointC,
          moonIllum: f.moonIllum,
          moonAltDeg: f.moonAltDeg,
          ts: f.ts,
        }));

        const scores = conditions.map(c => scoreNightQuality(c, targetType));
        const avgScore = Math.round(scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length);
        const bestHourScore = Math.max(...scores.map(s => s.totalScore));

        const allWarnings = Array.from(new Set(scores.flatMap(s => s.warnings)));

        let grade: string;
        if (avgScore >= 85) grade = "Excellent";
        else if (avgScore >= 70) grade = "Good";
        else if (avgScore >= 50) grade = "Fair";
        else if (avgScore >= 30) grade = "Poor";
        else grade = "Unusable";

        siteScores.push({
          siteId: site.id,
          siteName: site.name,
          avgScore,
          bestHourScore,
          grade,
          warnings: allWarnings,
          conditions,
        });
      }
    });

    // Sort by avgScore descending
    siteScores.sort((a, b) => b.avgScore - a.avgScore);
  }

  const toggleSite = (siteId: string) => {
    const newSelected = new Set(selectedSites);
    if (newSelected.has(siteId)) {
      newSelected.delete(siteId);
    } else {
      newSelected.add(siteId);
    }
    setSelectedSites(newSelected);
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case "Excellent":
        return "bg-green-500 text-white";
      case "Good":
        return "bg-blue-500 text-white";
      case "Fair":
        return "bg-yellow-500 text-black";
      case "Poor":
        return "bg-orange-500 text-white";
      case "Unusable":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Multi-Site Comparison
          </CardTitle>
          <CardDescription>
            Compare weather conditions across your observatory sites for the next {timeRange.hours} hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Site Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Select Sites to Compare</Label>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sites?.map((site) => (
                <div
                  key={site.id}
                  className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedSites.has(site.id) ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                  }`}
                  onClick={() => toggleSite(site.id)}
                >
                  <Checkbox
                    id={site.id}
                    checked={selectedSites.has(site.id)}
                    onCheckedChange={() => toggleSite(site.id)}
                  />
                  <label
                    htmlFor={site.id}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium text-sm">{site.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {site.lat.toFixed(2)}°, {site.lon.toFixed(2)}° • {site.elevM}m
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Target Type Selection */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Target Type:</Label>
            <div className="flex gap-2">
              {(["deep_sky", "planetary", "lunar", "solar"] as const).map((type) => (
                <Button
                  key={type}
                  variant={targetType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTargetType(type)}
                >
                  {type === "deep_sky" ? "Deep Sky" : type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {siteForecasts.isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Comparing conditions across sites...
            </div>
          )}

          {/* Comparison Results */}
          {siteScores.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <h3 className="font-semibold">Site Rankings (Next {timeRange.hours}h)</h3>
              </div>

              {siteScores.map((siteScore, index) => (
                <Card
                  key={siteScore.siteId}
                  className={`border-2 ${index === 0 ? "border-primary bg-primary/5" : ""}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {index === 0 && (
                          <Trophy className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                        )}
                        {index > 0 && (
                          <div className="w-8 text-center text-lg font-bold text-muted-foreground">
                            #{index + 1}
                          </div>
                        )}

                        <div className="flex-1">
                          <div className="font-semibold">{siteScore.siteName}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Average Score: <span className="font-medium">{siteScore.avgScore}</span> •
                            Best Hour: <span className="font-medium">{siteScore.bestHourScore}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-3xl font-bold">{siteScore.avgScore}</div>
                          <Badge className={`${getGradeColor(siteScore.grade)} mt-1`}>
                            {siteScore.grade}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Hourly Quality Bar */}
                    <div className="mt-4">
                      <div className="flex gap-0.5 h-3 rounded overflow-hidden">
                        {siteScore.conditions.map((cond, i) => {
                          const score = scoreNightQuality(cond, targetType);
                          let color;
                          if (score.totalScore >= 85) color = "#22c55e";
                          else if (score.totalScore >= 70) color = "#3b82f6";
                          else if (score.totalScore >= 50) color = "#eab308";
                          else if (score.totalScore >= 30) color = "#f97316";
                          else color = "#ef4444";

                          return (
                            <div
                              key={i}
                              className="flex-1"
                              style={{ backgroundColor: color }}
                              title={`Hour ${i + 1}: ${score.totalScore}`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Now</span>
                        <span>+{timeRange.hours}h</span>
                      </div>
                    </div>

                    {/* Warnings */}
                    {siteScore.warnings.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">Considerations:</div>
                        <div className="flex flex-wrap gap-1">
                          {siteScore.warnings.slice(0, 3).map((warning, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {warning}
                            </Badge>
                          ))}
                          {siteScore.warnings.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{siteScore.warnings.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Best Site Recommendation */}
          {siteScores.length > 0 && (
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Trophy className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Recommendation</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {siteScores[0].avgScore >= 70 ? (
                        <>
                          <span className="font-medium text-foreground">{siteScores[0].siteName}</span> offers
                          the best conditions for {targetType.replace("_", " ")} observing over the next {timeRange.hours} hours
                          with an average score of <span className="font-medium text-foreground">{siteScores[0].avgScore}</span>.
                        </>
                      ) : (
                        <>
                          All sites show suboptimal conditions. <span className="font-medium text-foreground">{siteScores[0].siteName}</span> is
                          relatively best but consider waiting for better weather.
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedSites.size === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Select at least one site to compare conditions</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
