import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Star,
  CloudRain,
  Moon,
  TrendingUp,
  Download,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import {
  scoreNightQuality,
  findBestWindow,
  rankNights,
  type ObservingConditions,
  type NightScore,
} from "./NightQualityScorer";

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
  tempC: number;
  dewpointC: number;
  moonIllum: number;
  moonAltDeg: number;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function getGradeColor(grade: string): string {
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
}

interface NightCardProps {
  date: string;
  score: number;
  grade: string;
  bestWindow: { start: string; end: string; avgScore: number } | null;
  conditions: ObservingConditions[];
  targetType: "deep_sky" | "planetary" | "lunar" | "solar";
  expanded: boolean;
  onToggle: () => void;
}

function NightCard({ date, score, grade, bestWindow, conditions, targetType, expanded, onToggle }: NightCardProps) {
  const hourlyScores = conditions.map(cond => scoreNightQuality(cond, targetType));

  return (
    <Card className="border-2">
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">{formatDate(new Date(date))}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {bestWindow
                  ? `Best window: ${formatTime(bestWindow.start)} - ${formatTime(bestWindow.end)}`
                  : "No suitable observing window found"}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold">{score}</div>
              <div className="text-xs text-muted-foreground">Quality Score</div>
            </div>
            <Badge className={getGradeColor(grade)}>{grade}</Badge>
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Hourly Breakdown */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Hourly Breakdown</h4>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {conditions.map((cond, idx) => {
                const score = hourlyScores[idx];
                const isInBestWindow =
                  bestWindow &&
                  new Date(cond.ts) >= new Date(bestWindow.start) &&
                  new Date(cond.ts) <= new Date(bestWindow.end);

                return (
                  <div
                    key={cond.ts}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      isInBestWindow ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                    } transition-colors`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 text-sm font-mono">{formatTime(cond.ts)}</div>
                      <div className="flex items-center gap-3 text-sm">
                        <div>
                          <CloudRain className="w-3 h-3 inline mr-1 text-muted-foreground" />
                          {cond.cloudPct.toFixed(0)}%
                        </div>
                        <div>
                          <Moon className="w-3 h-3 inline mr-1 text-muted-foreground" />
                          {(cond.moonIllum * 100).toFixed(0)}%
                        </div>
                        {score.warnings.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                            <AlertCircle className="w-3 h-3" />
                            {score.warnings.length}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-semibold">{score.totalScore}</div>
                        <Badge
                          className={`${getGradeColor(score.grade)} text-xs`}
                          variant="outline"
                        >
                          {score.grade}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Score Breakdown */}
          {hourlyScores[0] && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Average Score Components</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Weather</div>
                  <div className="text-sm font-semibold">
                    {Math.round(
                      hourlyScores.reduce((sum, s) => sum + s.breakdown.weather, 0) / hourlyScores.length
                    )}
                    /25
                  </div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Transparency</div>
                  <div className="text-sm font-semibold">
                    {Math.round(
                      hourlyScores.reduce((sum, s) => sum + s.breakdown.transparency, 0) / hourlyScores.length
                    )}
                    /20
                  </div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Seeing</div>
                  <div className="text-sm font-semibold">
                    {Math.round(
                      hourlyScores.reduce((sum, s) => sum + s.breakdown.seeing, 0) / hourlyScores.length
                    )}
                    /20
                  </div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Dew Risk</div>
                  <div className="text-sm font-semibold">
                    {Math.round(
                      hourlyScores.reduce((sum, s) => sum + s.breakdown.dewRisk, 0) / hourlyScores.length
                    )}
                    /10
                  </div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Moon</div>
                  <div className="text-sm font-semibold">
                    {Math.round(
                      hourlyScores.reduce((sum, s) => sum + s.breakdown.moonConditions, 0) / hourlyScores.length
                    )}
                    /15
                  </div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Target</div>
                  <div className="text-sm font-semibold">
                    {Math.round(
                      hourlyScores.reduce((sum, s) => sum + s.breakdown.targetVisibility, 0) / hourlyScores.length
                    )}
                    /10
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {hourlyScores.some(s => s.warnings.length > 0) && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                Warnings & Considerations
              </h4>
              <div className="space-y-1">
                {Array.from(
                  new Set(hourlyScores.flatMap(s => s.warnings))
                ).map((warning, idx) => (
                  <div key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-yellow-600 dark:text-yellow-400">•</span>
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function SessionPlanner() {
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [targetType, setTargetType] = useState<"deep_sky" | "planetary" | "lunar" | "solar">("deep_sky");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [expandedNight, setExpandedNight] = useState<string | null>(null);

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

  // Fetch weather forecasts for date range
  const { data: forecasts, isLoading } = useQuery<MeteoForecast[]>({
    queryKey: ["/api/ops/meteo/range", selectedSite, startDate, endDate],
    queryFn: async () => {
      if (!selectedSite) return [];

      const params = new URLSearchParams({
        from: new Date(startDate).toISOString(),
        to: new Date(endDate).toISOString(),
      });

      const res = await fetch(`/astrodb/v1/ops/weather/${selectedSite}?${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!selectedSite && !!startDate && !!endDate,
  });

  // Auto-select first site
  useEffect(() => {
    if (sites && sites.length > 0 && !selectedSite) {
      setSelectedSite(sites[0].id);
    }
  }, [sites, selectedSite]);

  // Group forecasts by date
  const nightlyForecasts: Array<{ date: string; conditions: ObservingConditions[] }> = [];

  if (forecasts) {
    const byDate = new Map<string, ObservingConditions[]>();

    forecasts.forEach(f => {
      const date = new Date(f.ts).toISOString().split("T")[0];
      if (!byDate.has(date)) {
        byDate.set(date, []);
      }
      byDate.get(date)!.push({
        cloudPct: f.cloudPct,
        transparencyIdx: f.transparencyIdx ?? undefined,
        seeingArcsec: f.seeingArcsec ?? undefined,
        windMps: f.windMps,
        dewMarginC: f.tempC - f.dewpointC,
        moonIllum: f.moonIllum,
        moonAltDeg: f.moonAltDeg,
        ts: f.ts,
      });
    });

    byDate.forEach((conditions, date) => {
      nightlyForecasts.push({ date, conditions });
    });

    nightlyForecasts.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Rank nights
  const rankedNights = rankNights(nightlyForecasts, targetType);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Observing Session Planner
          </CardTitle>
          <CardDescription>
            Find the best nights for imaging based on weather, moon, and target conditions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Observatory Site</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
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

            <div className="space-y-2">
              <Label>Target Type</Label>
              <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deep_sky">Deep Sky (Galaxies, Nebulae)</SelectItem>
                  <SelectItem value="planetary">Planetary</SelectItem>
                  <SelectItem value="lunar">Lunar</SelectItem>
                  <SelectItem value="solar">Solar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Analyzing conditions for your observing window...
            </div>
          )}

          {/* Summary */}
          {rankedNights.length > 0 && (
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {rankedNights.filter(n => n.score >= 70).length}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Excellent/Good Nights
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {rankedNights[0]?.score || 0}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Best Night Score
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      {rankedNights[0] ? formatDate(new Date(rankedNights[0].date)) : "-"}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Best Night
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Ranked Nights */}
          {rankedNights.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Nights Ranked by Quality
                </h3>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export to Calendar
                </Button>
              </div>

              {rankedNights.map((night) => {
                const nightConditions = nightlyForecasts.find(n => n.date === night.date);
                if (!nightConditions) return null;

                return (
                  <NightCard
                    key={night.date}
                    date={night.date}
                    score={night.score}
                    grade={night.grade}
                    bestWindow={night.bestWindow}
                    conditions={nightConditions.conditions}
                    targetType={targetType}
                    expanded={expandedNight === night.date}
                    onToggle={() => setExpandedNight(expandedNight === night.date ? null : night.date)}
                  />
                );
              })}
            </div>
          )}

          {selectedSite && (!forecasts || forecasts.length === 0) && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No forecast data available for the selected date range.</p>
              <p className="text-sm">Weather forecasts are typically available 7-10 days in advance.</p>
            </div>
          )}

          {!selectedSite && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Select a site and date range to plan your observing sessions</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
