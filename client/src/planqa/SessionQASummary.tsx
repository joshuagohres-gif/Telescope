import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Focus, TrendingUp, FileText } from "lucide-react";

interface QASummary {
  frames: number;
  medianHfr: number;
  rejectRate: number;
  guidingRms: {
    ra: number;
    dec: number;
  } | null;
  notes: string;
}

function getQualityLevel(hfr: number): { label: string; color: string } {
  if (hfr < 2.0) return { label: "Excellent", color: "bg-green-500" };
  if (hfr < 3.0) return { label: "Good", color: "bg-blue-500" };
  if (hfr < 4.0) return { label: "Fair", color: "bg-yellow-500" };
  return { label: "Poor", color: "bg-red-500" };
}

function getRejectRateLevel(rate: number): { label: string; color: string } {
  if (rate === 0) return { label: "Perfect", color: "bg-green-500" };
  if (rate < 0.1) return { label: "Excellent", color: "bg-blue-500" };
  if (rate < 0.25) return { label: "Good", color: "bg-yellow-500" };
  if (rate < 0.5) return { label: "Fair", color: "bg-orange-500" };
  return { label: "Poor", color: "bg-red-500" };
}

function getGuidingLevel(rms: number): { label: string; color: string } {
  if (rms < 0.5) return { label: "Excellent", color: "bg-green-500" };
  if (rms < 1.0) return { label: "Good", color: "bg-blue-500" };
  if (rms < 1.5) return { label: "Fair", color: "bg-yellow-500" };
  return { label: "Poor", color: "bg-red-500" };
}

export function SessionQASummary() {
  const [sessionId, setSessionId] = useState<string>("");
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data: summary, isLoading, error, refetch } = useQuery<QASummary>({
    queryKey: ["/api/qa/summary", sessionId],
    queryFn: async () => {
      const res = await fetch(`/astrodb/v1/qa/summary?session_id=${sessionId}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Plan & QA Pack not enabled. Set ASTRO_PLANQA_ENABLED=true");
        }
        if (res.status === 400) {
          throw new Error("Session not found or no data available");
        }
        throw new Error("Failed to fetch QA summary");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: shouldFetch && !!sessionId,
  });

  const handleGetSummary = () => {
    if (!sessionId.trim()) return;
    setShouldFetch(true);
    refetch();
  };

  const hfrQuality = summary ? getQualityLevel(summary.medianHfr) : null;
  const rejectQuality = summary ? getRejectRateLevel(summary.rejectRate) : null;
  const totalRms = summary?.guidingRms
    ? Math.sqrt(summary.guidingRms.ra ** 2 + summary.guidingRms.dec ** 2)
    : null;
  const guidingQuality = totalRms ? getGuidingLevel(totalRms) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Session QA Summary
        </CardTitle>
        <CardDescription>
          Quality assurance metrics rollup from per-frame submetrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Form */}
        <div className="space-y-2">
          <Label htmlFor="sessionId">Session ID (UUID)</Label>
          <div className="flex gap-2">
            <Input
              id="sessionId"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
              className="flex-1"
            />
            <Button onClick={handleGetSummary} disabled={isLoading || !sessionId.trim()}>
              {isLoading ? "Loading..." : "Get Summary"}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive">{error.message}</p>
          </div>
        )}

        {/* Summary Display */}
        {summary && (
          <div className="space-y-4">
            {/* Overall Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Frame Count */}
              <div className="p-6 border rounded-lg bg-muted/50 text-center">
                <div className="text-4xl font-bold text-primary">{summary.frames}</div>
                <div className="text-sm text-muted-foreground mt-1">Total Frames</div>
              </div>

              {/* Accepted Frames */}
              <div className="p-6 border rounded-lg bg-muted/50 text-center">
                <div className="text-4xl font-bold text-green-600">
                  {Math.round(summary.frames * (1 - summary.rejectRate))}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Accepted Frames ({((1 - summary.rejectRate) * 100).toFixed(1)}%)
                </div>
              </div>

              {/* Rejected Frames */}
              <div className="p-6 border rounded-lg bg-muted/50 text-center">
                <div className="text-4xl font-bold text-red-600">
                  {Math.round(summary.frames * summary.rejectRate)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Rejected Frames ({(summary.rejectRate * 100).toFixed(1)}%)
                </div>
              </div>
            </div>

            {/* Quality Metrics */}
            <div className="space-y-3">
              {/* HFR */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Focus className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Median HFR (Half-Flux Radius)</div>
                      <div className="text-sm text-muted-foreground">
                        Star focus quality indicator
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold">{summary.medianHfr.toFixed(2)}"</div>
                    {hfrQuality && (
                      <Badge className={hfrQuality.color}>
                        {hfrQuality.label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Reject Rate */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {summary.rejectRate === 0 ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium">Reject Rate</div>
                      <div className="text-sm text-muted-foreground">
                        Fraction of frames flagged for rejection
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold">
                      {(summary.rejectRate * 100).toFixed(1)}%
                    </div>
                    {rejectQuality && (
                      <Badge className={rejectQuality.color}>
                        {rejectQuality.label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Guiding RMS */}
              {summary.guidingRms && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Guiding RMS</div>
                        <div className="text-sm text-muted-foreground">
                          Average guiding error in arcseconds
                        </div>
                      </div>
                    </div>
                    {guidingQuality && (
                      <Badge className={guidingQuality.color}>
                        {guidingQuality.label}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold">{summary.guidingRms.ra.toFixed(3)}"</div>
                      <div className="text-xs text-muted-foreground">RA RMS</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{summary.guidingRms.dec.toFixed(3)}"</div>
                      <div className="text-xs text-muted-foreground">Dec RMS</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{totalRms!.toFixed(3)}"</div>
                      <div className="text-xs text-muted-foreground">Total RMS</div>
                    </div>
                  </div>
                </div>
              )}

              {!summary.guidingRms && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">No guiding data available for this session</span>
                  </div>
                </div>
              )}
            </div>

            {/* Session Notes */}
            {summary.notes && (
              <div className="p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold">Session Notes</h3>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {summary.notes}
                </p>
              </div>
            )}

            {/* Quality Interpretation */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold mb-2">Quality Interpretation</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>HFR:</strong> Lower is better. &lt;2.0" = Excellent, 2-3" = Good, 3-4" = Fair, &gt;4" = Poor</p>
                <p><strong>Reject Rate:</strong> 0% = Perfect, &lt;10% = Excellent, &lt;25% = Good, &lt;50% = Fair, ≥50% = Poor</p>
                <p><strong>Guiding RMS:</strong> Lower is better. &lt;0.5" = Excellent, 0.5-1.0" = Good, 1.0-1.5" = Fair, &gt;1.5" = Poor</p>
              </div>
            </div>
          </div>
        )}

        {!summary && !error && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Enter a session ID above to view quality assurance metrics</p>
            <p className="text-sm mt-2">QA summary aggregates per-frame metrics into session-level statistics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
