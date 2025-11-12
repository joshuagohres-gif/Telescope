import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mountain } from "lucide-react";

interface Site {
  id: string;
  name: string;
}

interface HorizonPoint {
  azDeg: number;
  altLimitDeg: number;
}

export function HorizonVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // Auto-select first site
  useEffect(() => {
    if (sites && sites.length > 0 && !selectedSite) {
      setSelectedSite(sites[0].id);
    }
  }, [sites, selectedSite]);

  // Draw polar chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !horizonData || horizonData.length === 0) return;

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
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    // Draw concentric circles (altitude rings)
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    for (let alt = 0; alt <= 90; alt += 15) {
      const r = radius * (1 - alt / 90);
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();

      // Label altitude
      if (alt > 0) {
        ctx.fillStyle = "#666";
        ctx.font = "10px monospace";
        ctx.fillText(`${alt}°`, centerX + r + 5, centerY);
      }
    }

    // Draw azimuth lines
    ctx.strokeStyle = "#333";
    for (let az = 0; az < 360; az += 45) {
      const angle = ((az - 90) * Math.PI) / 180; // -90 to start from North (top)
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
      ctx.fillStyle = "#999";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = az === 0 ? "N" : az === 90 ? "E" : az === 180 ? "S" : az === 270 ? "W" : `${az}°`;
      ctx.fillText(label, labelX, labelY);
    }

    // Draw horizon mask
    if (horizonData.length > 1) {
      ctx.strokeStyle = "#f59e0b";
      ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
      ctx.lineWidth = 2;

      // Sort by azimuth
      const sortedData = [...horizonData].sort((a, b) => a.azDeg - b.azDeg);

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

    // Draw center dot
    ctx.fillStyle = "#666";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Title
    ctx.fillStyle = "#fff";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Horizon Mask (Polar View)", centerX, 20);
  }, [horizonData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mountain className="w-5 h-5" />
          Horizon Visualizer
        </CardTitle>
        <CardDescription>
          View site-specific altitude limits by azimuth (obstructions, trees, buildings)
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

        {/* Polar Chart Canvas */}
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={500}
            height={500}
            className="border border-border rounded-lg"
          />
        </div>

        {/* Stats */}
        {horizonData && horizonData.length > 0 && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {horizonData.length}
              </div>
              <div className="text-xs text-muted-foreground">Data Points</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {Math.min(...horizonData.map((p) => p.altLimitDeg)).toFixed(1)}°
              </div>
              <div className="text-xs text-muted-foreground">Min Altitude</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {Math.max(...horizonData.map((p) => p.altLimitDeg)).toFixed(1)}°
              </div>
              <div className="text-xs text-muted-foreground">Max Altitude</div>
            </div>
          </div>
        )}

        {selectedSite && (!horizonData || horizonData.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <Mountain className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No horizon data for this site.</p>
            <p className="text-sm">Upload horizon mask CSV to visualize obstructions.</p>
          </div>
        )}

        {!selectedSite && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Select a site to view horizon mask</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
