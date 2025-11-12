import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Mountain, Edit3, Save, X, Plus, Trash2 } from "lucide-react";

interface Site {
  id: string;
  name: string;
}

interface HorizonPoint {
  id?: number;
  azDeg: number;
  altLimitDeg: number;
  obstacleType?: "tree" | "building" | "mountain" | "terrain" | null;
  label?: string;
}

interface ObstacleMarker extends HorizonPoint {
  tempId: string; // For tracking unsaved points
}

export function HorizonEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [editMode, setEditMode] = useState(false);
  const [obstacles, setObstacles] = useState<ObstacleMarker[]>([]);
  const [selectedObstacle, setSelectedObstacle] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const queryClient = useQueryClient();

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

  // Fetch horizon data for selected site
  const { data: horizonData } = useQuery<HorizonPoint[]>({
    queryKey: ["/api/ops/horizon", selectedSite],
    queryFn: async () => {
      if (!selectedSite) return [];
      const res = await fetch(`/api/ops/sites/${selectedSite}/horizon`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!selectedSite,
  });

  // Save horizon mutation
  const saveMutation = useMutation({
    mutationFn: async (data: HorizonPoint[]) => {
      const res = await fetch(`/api/ops/sites/${selectedSite}/horizon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horizonPoints: data }),
      });
      if (!res.ok) throw new Error("Failed to save horizon data");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ops/horizon", selectedSite] });
      setEditMode(false);
    },
  });

  // Auto-select first site
  useEffect(() => {
    if (sites && sites.length > 0 && !selectedSite) {
      setSelectedSite(sites[0].id);
    }
  }, [sites, selectedSite]);

  // Load horizon data into obstacles when fetched or site changes
  useEffect(() => {
    if (horizonData && !editMode) {
      setObstacles(
        horizonData.map((point, i) => ({
          ...point,
          tempId: `point-${i}`,
        }))
      );
    }
  }, [horizonData, editMode]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    // Convert canvas coordinates to polar coordinates
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if click is within the polar chart
    if (distance > radius) return;

    // Calculate azimuth (0° = North, clockwise)
    let azDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (azDeg < 0) azDeg += 360;
    if (azDeg >= 360) azDeg -= 360;

    // Calculate altitude (0° = horizon at edge, 90° = zenith at center)
    const altLimitDeg = Math.max(0, Math.min(90, 90 * (1 - distance / radius)));

    // Check if clicking near existing obstacle
    const clickedObstacle = obstacles.find((obs) => {
      const obsAngle = ((obs.azDeg - 90) * Math.PI) / 180;
      const obsR = radius * (1 - obs.altLimitDeg / 90);
      const obsX = centerX + obsR * Math.cos(obsAngle);
      const obsY = centerY + obsR * Math.sin(obsAngle);
      const dist = Math.sqrt((x - obsX) ** 2 + (y - obsY) ** 2);
      return dist < 15; // 15px tolerance
    });

    if (clickedObstacle) {
      setSelectedObstacle(clickedObstacle.tempId);
    } else {
      // Add new obstacle
      const newObstacle: ObstacleMarker = {
        azDeg: Math.round(azDeg),
        altLimitDeg: Math.round(altLimitDeg * 10) / 10,
        obstacleType: "terrain",
        tempId: `new-${Date.now()}`,
      };
      setObstacles([...obstacles, newObstacle]);
      setSelectedObstacle(newObstacle.tempId);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editMode || !selectedObstacle || !isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > radius) return;

    let azDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (azDeg < 0) azDeg += 360;
    if (azDeg >= 360) azDeg -= 360;

    const altLimitDeg = Math.max(0, Math.min(90, 90 * (1 - distance / radius)));

    setObstacles(
      obstacles.map((obs) =>
        obs.tempId === selectedObstacle
          ? { ...obs, azDeg: Math.round(azDeg), altLimitDeg: Math.round(altLimitDeg * 10) / 10 }
          : obs
      )
    );
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editMode) return;
    setIsDragging(true);
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const deleteSelectedObstacle = () => {
    if (!selectedObstacle) return;
    setObstacles(obstacles.filter((obs) => obs.tempId !== selectedObstacle));
    setSelectedObstacle(null);
  };

  const handleSave = () => {
    const dataToSave = obstacles.map((obs) => ({
      azDeg: obs.azDeg,
      altLimitDeg: obs.altLimitDeg,
      obstacleType: obs.obstacleType,
      label: obs.label,
    }));
    saveMutation.mutate(dataToSave);
  };

  const handleCancel = () => {
    setEditMode(false);
    if (horizonData) {
      setObstacles(
        horizonData.map((point, i) => ({
          ...point,
          tempId: `point-${i}`,
        }))
      );
    }
    setSelectedObstacle(null);
  };

  const selectedObstacleData = obstacles.find((obs) => obs.tempId === selectedObstacle);

  const updateSelectedObstacle = (updates: Partial<ObstacleMarker>) => {
    if (!selectedObstacle) return;
    setObstacles(
      obstacles.map((obs) =>
        obs.tempId === selectedObstacle ? { ...obs, ...updates } : obs
      )
    );
  };

  // Draw polar chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = editMode ? "#0f0f0f" : "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    // Draw concentric circles (altitude rings)
    ctx.strokeStyle = editMode ? "#444" : "#333";
    ctx.lineWidth = 1;
    for (let alt = 0; alt <= 90; alt += 15) {
      const r = radius * (1 - alt / 90);
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();

      // Label altitude
      if (alt > 0) {
        ctx.fillStyle = editMode ? "#888" : "#666";
        ctx.font = "10px monospace";
        ctx.fillText(`${alt}°`, centerX + r + 5, centerY);
      }
    }

    // Draw azimuth lines
    ctx.strokeStyle = editMode ? "#444" : "#333";
    for (let az = 0; az < 360; az += 45) {
      const angle = ((az - 90) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + radius * Math.cos(angle),
        centerY + radius * Math.sin(angle)
      );
      ctx.stroke();

      // Label cardinal directions
      const labelRadius = radius + 20;
      const labelX = centerX + labelRadius * Math.cos(angle);
      const labelY = centerY + labelRadius * Math.sin(angle);
      ctx.fillStyle = editMode ? "#aaa" : "#999";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = az === 0 ? "N" : az === 90 ? "E" : az === 180 ? "S" : az === 270 ? "W" : `${az}°`;
      ctx.fillText(label, labelX, labelY);
    }

    // Draw horizon mask
    if (obstacles.length > 1) {
      ctx.strokeStyle = editMode ? "#3b82f6" : "#f59e0b";
      ctx.fillStyle = editMode ? "rgba(59, 130, 246, 0.15)" : "rgba(245, 158, 11, 0.2)";
      ctx.lineWidth = 2;

      // Sort by azimuth
      const sortedData = [...obstacles].sort((a, b) => a.azDeg - b.azDeg);

      // Start path
      ctx.beginPath();
      sortedData.forEach((point, i) => {
        const az = point.azDeg;
        const alt = point.altLimitDeg;
        const angle = ((az - 90) * Math.PI) / 180;
        const r = radius * (1 - alt / 90);
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      // Close path back to first point
      const firstPoint = sortedData[0];
      const firstAngle = ((firstPoint.azDeg - 90) * Math.PI) / 180;
      const firstR = radius * (1 - firstPoint.altLimitDeg / 90);
      ctx.lineTo(
        centerX + firstR * Math.cos(firstAngle),
        centerY + firstR * Math.sin(firstAngle)
      );

      ctx.fill();
      ctx.stroke();
    }

    // Draw obstacle markers
    obstacles.forEach((obstacle) => {
      const angle = ((obstacle.azDeg - 90) * Math.PI) / 180;
      const r = radius * (1 - obstacle.altLimitDeg / 90);
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);

      const isSelected = obstacle.tempId === selectedObstacle;

      // Draw obstacle point
      ctx.fillStyle = isSelected ? "#3b82f6" : editMode ? "#10b981" : "#f59e0b";
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 8 : 5, 0, Math.PI * 2);
      ctx.fill();

      // Draw outline for selected
      if (isSelected) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw label if exists
      if (obstacle.label && editMode) {
        ctx.fillStyle = "#fff";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(obstacle.label, x, y - 15);
      }
    });

    // Draw center dot
    ctx.fillStyle = "#666";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Title
    ctx.fillStyle = "#fff";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      editMode ? "Horizon Editor - Click to Add/Edit Obstacles" : "Horizon Mask (Polar View)",
      centerX,
      20
    );
  }, [obstacles, editMode, selectedObstacle]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mountain className="w-5 h-5" />
              Horizon Editor
            </CardTitle>
            <CardDescription>
              Interactive editor for site-specific altitude limits and obstructions
            </CardDescription>
          </div>
          {!editMode ? (
            <Button onClick={() => setEditMode(true)} variant="outline" className="gap-2">
              <Edit3 className="w-4 h-4" />
              Edit Mode
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleCancel} variant="outline" className="gap-2">
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} className="gap-2" disabled={saveMutation.isPending}>
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Site Selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Observatory Site:</label>
          <Select value={selectedSite} onValueChange={setSelectedSite} disabled={editMode}>
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
          {editMode && (
            <Badge variant="secondary" className="ml-2">
              {obstacles.length} points
            </Badge>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Polar Chart Canvas */}
          <div className="md:col-span-2">
            <canvas
              ref={canvasRef}
              width={600}
              height={600}
              className={`border border-border rounded-lg ${editMode ? "cursor-crosshair" : ""}`}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseDown={handleCanvasMouseDown}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
          </div>

          {/* Obstacle Editor Panel */}
          {editMode && (
            <div className="space-y-4">
              <div className="p-4 border border-border rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  {selectedObstacleData ? "Edit Obstacle" : "Click map to add"}
                </h3>

                {selectedObstacleData ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Azimuth (0-360°)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="360"
                        value={selectedObstacleData.azDeg}
                        onChange={(e) =>
                          updateSelectedObstacle({ azDeg: parseInt(e.target.value) || 0 })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Altitude Limit (0-90°)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="90"
                        step="0.1"
                        value={selectedObstacleData.altLimitDeg}
                        onChange={(e) =>
                          updateSelectedObstacle({ altLimitDeg: parseFloat(e.target.value) || 0 })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Obstacle Type</Label>
                      <Select
                        value={selectedObstacleData.obstacleType || "terrain"}
                        onValueChange={(value) =>
                          updateSelectedObstacle({
                            obstacleType: value as ObstacleMarker["obstacleType"],
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="terrain">Terrain</SelectItem>
                          <SelectItem value="tree">Tree</SelectItem>
                          <SelectItem value="building">Building</SelectItem>
                          <SelectItem value="mountain">Mountain</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Label (optional)</Label>
                      <Input
                        value={selectedObstacleData.label || ""}
                        onChange={(e) => updateSelectedObstacle({ label: e.target.value })}
                        placeholder="e.g., Oak Tree"
                        className="mt-1"
                      />
                    </div>
                    <Button
                      onClick={deleteSelectedObstacle}
                      variant="destructive"
                      size="sm"
                      className="w-full gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Point
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click anywhere on the polar chart to add a horizon obstacle point. Drag points to adjust their position.
                  </p>
                )}
              </div>

              {obstacles.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>💡 Tips:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Click to add new points</li>
                    <li>Click and drag to move points</li>
                    <li>Select point to edit details</li>
                    <li>Save when done editing</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        {obstacles.length > 0 && !editMode && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{obstacles.length}</div>
              <div className="text-xs text-muted-foreground">Data Points</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {Math.min(...obstacles.map((p) => p.altLimitDeg)).toFixed(1)}°
              </div>
              <div className="text-xs text-muted-foreground">Min Altitude</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {Math.max(...obstacles.map((p) => p.altLimitDeg)).toFixed(1)}°
              </div>
              <div className="text-xs text-muted-foreground">Max Altitude</div>
            </div>
          </div>
        )}

        {selectedSite && obstacles.length === 0 && !editMode && (
          <div className="text-center py-8 text-muted-foreground">
            <Mountain className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No horizon data for this site.</p>
            <p className="text-sm">Click "Edit Mode" to start adding obstacles.</p>
          </div>
        )}

        {!selectedSite && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Select a site to view or edit horizon mask</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
