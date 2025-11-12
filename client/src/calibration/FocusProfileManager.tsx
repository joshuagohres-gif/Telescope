import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Trash2, TrendingUp, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FocusProfile {
  id: string;
  name: string;
  dateCreated: string;
  sampleCount: number;
  fitType: string; // "quadratic", "gaussian", "hyperbolic"
  bestFocusPosition: number;
  fwhm: number;
  samples: FocusSample[];
  fitParameters: {
    a: number;
    b: number;
    c: number;
    d?: number;
  };
}

interface FocusSample {
  position: number;
  hfr: number;
}

interface ProfilesResponse {
  profiles: FocusProfile[];
}

export function FocusProfileManager() {
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [uploadData, setUploadData] = useState<string>("");
  const [profileName, setProfileName] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all profiles
  const { data, isLoading, error } = useQuery<ProfilesResponse>({
    queryKey: ["/api/calibration/focus-profiles"],
    queryFn: async () => {
      const res = await fetch("/astrodb/v1/calibration/focus-profiles");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch focus profiles");
      }
      const json = await res.json();
      return json.data;
    },
  });

  // Upload new profile mutation
  const uploadMutation = useMutation({
    mutationFn: async (profileData: { name: string; samples: string }) => {
      const res = await fetch("/astrodb/v1/calibration/focus-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileData.name, samples: profileData.samples }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to upload focus profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calibration/focus-profiles"] });
      toast({
        title: "Success",
        description: "Focus profile uploaded and fitted successfully",
      });
      setUploadData("");
      setProfileName("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete profile mutation
  const deleteMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const res = await fetch(`/astrodb/v1/calibration/focus-profiles/${profileId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete focus profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calibration/focus-profiles"] });
      toast({
        title: "Success",
        description: "Focus profile deleted successfully",
      });
      setSelectedProfileId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (!profileName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a profile name",
        variant: "destructive",
      });
      return;
    }
    if (!uploadData.trim()) {
      toast({
        title: "Error",
        description: "Please enter sample data",
        variant: "destructive",
      });
      return;
    }
    uploadMutation.mutate({ name: profileName, samples: uploadData });
  };

  const handleDelete = () => {
    if (selectedProfileId) {
      deleteMutation.mutate(selectedProfileId);
    }
  };

  const selectedProfile = data?.profiles.find((p) => p.id === selectedProfileId);

  // Calculate chart for selected profile
  let chartData = null;
  if (selectedProfile && selectedProfile.samples.length > 0) {
    const positions = selectedProfile.samples.map((s) => s.position);
    const hfrs = selectedProfile.samples.map((s) => s.hfr);

    const minPos = Math.min(...positions);
    const maxPos = Math.max(...positions);
    const minHfr = Math.min(...hfrs);
    const maxHfr = Math.max(...hfrs);

    const posRange = maxPos - minPos;
    const hfrRange = maxHfr - minHfr;

    const chartWidth = 600;
    const chartHeight = 400;
    const padding = 50;
    const innerWidth = chartWidth - 2 * padding;
    const innerHeight = chartHeight - 2 * padding;

    const posMin = minPos - posRange * 0.1;
    const posMax = maxPos + posRange * 0.1;
    const hfrMin = Math.max(0, minHfr - hfrRange * 0.1);
    const hfrMax = maxHfr + hfrRange * 0.1;

    const scaleX = (pos: number) => padding + ((pos - posMin) / (posMax - posMin)) * innerWidth;
    const scaleY = (hfr: number) => chartHeight - padding - ((hfr - hfrMin) / (hfrMax - hfrMin)) * innerHeight;

    // Generate fitted curve points
    const curvePoints: { x: number; y: number }[] = [];
    const { a, b, c, d } = selectedProfile.fitParameters;
    for (let i = 0; i <= 100; i++) {
      const pos = posMin + (i / 100) * (posMax - posMin);
      let hfr: number;

      if (selectedProfile.fitType === "quadratic") {
        hfr = a * pos * pos + b * pos + c;
      } else if (selectedProfile.fitType === "gaussian" && d !== undefined) {
        hfr = a * Math.exp(-((pos - b) ** 2) / (2 * c * c)) + d;
      } else {
        // hyperbolic
        hfr = Math.sqrt(a * (pos - b) ** 2 + c);
      }

      curvePoints.push({ x: scaleX(pos), y: scaleY(hfr) });
    }

    chartData = {
      width: chartWidth,
      height: chartHeight,
      padding,
      posMin,
      posMax,
      hfrMin,
      hfrMax,
      scaleX,
      scaleY,
      samples: selectedProfile.samples.map((s) => ({
        x: scaleX(s.position),
        y: scaleY(s.hfr),
        position: s.position,
        hfr: s.hfr,
      })),
      curvePoints,
      bestFocus: {
        x: scaleX(selectedProfile.bestFocusPosition),
        y: scaleY(selectedProfile.fwhm),
      },
    };
  }

  function getFitTypeColor(fitType: string): string {
    switch (fitType) {
      case "quadratic":
        return "bg-blue-500";
      case "gaussian":
        return "bg-purple-500";
      case "hyperbolic":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Focus Profile Manager</h2>
          <p className="text-sm text-muted-foreground">
            Upload focus samples, view fitted curves, and manage focus profiles
          </p>
        </div>

        {/* Upload Section */}
        <Card className="p-4 bg-muted/50">
          <h3 className="font-semibold mb-4">Upload New Profile</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Profile Name</Label>
              <Input
                id="profile-name"
                placeholder="e.g., M42 Focus Run 2024-01-15"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sample-data">Sample Data (CSV format: position,hfr)</Label>
              <textarea
                id="sample-data"
                className="w-full min-h-[120px] px-3 py-2 text-sm border rounded-md bg-background"
                placeholder="5000,3.2&#10;5100,2.8&#10;5200,2.5&#10;5300,2.4&#10;5400,2.6&#10;5500,2.9"
                value={uploadData}
                onChange={(e) => setUploadData(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter one measurement per line in format: position,hfr (e.g., 5000,3.2)
              </p>
            </div>

            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="w-full gap-2"
            >
              <Upload className="w-4 h-4" />
              {uploadMutation.isPending ? "Uploading..." : "Upload & Fit Curve"}
            </Button>
          </div>
        </Card>

        {/* Profile Selection */}
        <div className="space-y-2">
          <Label htmlFor="profile-select">Select Profile</Label>
          <div className="flex gap-2">
            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger id="profile-select" className="flex-1">
                <SelectValue placeholder="Choose a focus profile" />
              </SelectTrigger>
              <SelectContent>
                {data?.profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name} - {new Date(profile.dateCreated).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!selectedProfileId || deleteMutation.isPending}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Loading/Error States */}
        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            Loading focus profiles...
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-destructive">
            Error: {error instanceof Error ? error.message : "Failed to load profiles"}
          </div>
        )}

        {/* Profile Details */}
        {selectedProfile && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Best Focus</div>
                  <div className="text-2xl font-bold">
                    {Math.round(selectedProfile.bestFocusPosition)}
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">FWHM</div>
                  <div className="text-2xl font-bold">{selectedProfile.fwhm.toFixed(2)}"</div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Samples</div>
                  <div className="text-2xl font-bold">{selectedProfile.sampleCount}</div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Fit Type</div>
                  <Badge className={getFitTypeColor(selectedProfile.fitType)}>
                    {selectedProfile.fitType}
                  </Badge>
                </div>
              </Card>
            </div>

            {/* Chart */}
            {chartData && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Focus Curve</h3>
                <div className="flex justify-center">
                  <svg width={chartData.width} height={chartData.height} className="border rounded">
                    {/* Grid */}
                    <g opacity="0.2">
                      {[0, 1, 2, 3, 4].map((i) => {
                        const y = chartData.padding + (i * (chartData.height - 2 * chartData.padding)) / 4;
                        return (
                          <line
                            key={`grid-h-${i}`}
                            x1={chartData.padding}
                            y1={y}
                            x2={chartData.width - chartData.padding}
                            y2={y}
                            stroke="currentColor"
                            strokeWidth="1"
                          />
                        );
                      })}
                      {[0, 1, 2, 3, 4].map((i) => {
                        const x = chartData.padding + (i * (chartData.width - 2 * chartData.padding)) / 4;
                        return (
                          <line
                            key={`grid-v-${i}`}
                            x1={x}
                            y1={chartData.padding}
                            x2={x}
                            y2={chartData.height - chartData.padding}
                            stroke="currentColor"
                            strokeWidth="1"
                          />
                        );
                      })}
                    </g>

                    {/* Axes */}
                    <line
                      x1={chartData.padding}
                      y1={chartData.height - chartData.padding}
                      x2={chartData.width - chartData.padding}
                      y2={chartData.height - chartData.padding}
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1={chartData.padding}
                      y1={chartData.padding}
                      x2={chartData.padding}
                      y2={chartData.height - chartData.padding}
                      stroke="currentColor"
                      strokeWidth="2"
                    />

                    {/* Fitted curve */}
                    <polyline
                      points={chartData.curvePoints.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />

                    {/* Sample points */}
                    {chartData.samples.map((sample, i) => (
                      <circle
                        key={i}
                        cx={sample.x}
                        cy={sample.y}
                        r="5"
                        fill="#6366f1"
                        stroke="white"
                        strokeWidth="2"
                      >
                        <title>
                          Position: {Math.round(sample.position)}, HFR: {sample.hfr.toFixed(2)}"
                        </title>
                      </circle>
                    ))}

                    {/* Best focus marker */}
                    <line
                      x1={chartData.bestFocus.x}
                      y1={chartData.padding}
                      x2={chartData.bestFocus.x}
                      y2={chartData.height - chartData.padding}
                      stroke="#22c55e"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                    <circle
                      cx={chartData.bestFocus.x}
                      cy={chartData.bestFocus.y}
                      r="7"
                      fill="#22c55e"
                      stroke="white"
                      strokeWidth="2"
                    >
                      <title>
                        Best Focus: {Math.round(selectedProfile.bestFocusPosition)} (HFR: {selectedProfile.fwhm.toFixed(2)}")
                      </title>
                    </circle>

                    {/* Axis labels */}
                    <text
                      x={chartData.width / 2}
                      y={chartData.height - 10}
                      textAnchor="middle"
                      className="text-sm fill-current"
                    >
                      Focus Position
                    </text>
                    <text
                      x={15}
                      y={chartData.height / 2}
                      textAnchor="middle"
                      transform={`rotate(-90, 15, ${chartData.height / 2})`}
                      className="text-sm fill-current"
                    >
                      HFR (arcsec)
                    </text>

                    {/* Tick labels */}
                    <text
                      x={chartData.padding}
                      y={chartData.height - chartData.padding + 20}
                      textAnchor="middle"
                      className="text-xs fill-current"
                    >
                      {Math.round(chartData.posMin)}
                    </text>
                    <text
                      x={chartData.width - chartData.padding}
                      y={chartData.height - chartData.padding + 20}
                      textAnchor="middle"
                      className="text-xs fill-current"
                    >
                      {Math.round(chartData.posMax)}
                    </text>
                    <text
                      x={chartData.padding - 10}
                      y={chartData.height - chartData.padding}
                      textAnchor="end"
                      className="text-xs fill-current"
                    >
                      {chartData.hfrMin.toFixed(1)}
                    </text>
                    <text
                      x={chartData.padding - 10}
                      y={chartData.padding}
                      textAnchor="end"
                      className="text-xs fill-current"
                    >
                      {chartData.hfrMax.toFixed(1)}
                    </text>
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-white"></div>
                    <span>Measured Samples</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-blue-500"></div>
                    <span>Fitted Curve</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
                    <span>Best Focus</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Fit Parameters */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Fit Parameters</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">a:</span>{" "}
                  <span className="font-mono">{selectedProfile.fitParameters.a.toExponential(4)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">b:</span>{" "}
                  <span className="font-mono">{selectedProfile.fitParameters.b.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">c:</span>{" "}
                  <span className="font-mono">{selectedProfile.fitParameters.c.toFixed(4)}</span>
                </div>
                {selectedProfile.fitParameters.d !== undefined && (
                  <div>
                    <span className="text-muted-foreground">d:</span>{" "}
                    <span className="font-mono">{selectedProfile.fitParameters.d.toFixed(4)}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </Card>
  );
}
