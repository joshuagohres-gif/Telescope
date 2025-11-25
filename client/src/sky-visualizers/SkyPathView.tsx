import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { equatorialToHorizontal } from "@/simulatedSkyBackdrop/math/altaz";

interface SkyPathPoint {
  t: number;
  ra: number; // radians
  dec: number; // radians
  alt: number; // degrees
  az: number; // degrees
  magnitude?: number;
  distance?: number;
  visible: boolean;
}

interface Star {
  id: number;
  hip: number | null;
  ra: number; // degrees
  dec: number; // degrees
  magnitude: number;
  bv: number | null;
  properName: string | null;
}

interface SkyPathViewProps {
  objectIds: number[];
  observerLat: number;
  observerLon: number;
  startDate: Date;
  endDate: Date;
}

export function SkyPathView({
  objectIds,
  observerLat,
  observerLon,
  startDate,
  endDate,
}: SkyPathViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Fetch stars
  const { data: stars } = useQuery({
    queryKey: ["stars", "limit-500"],
    queryFn: async () => {
      const response = await fetch("/api/sky-visualizers/stars?limit=500");
      if (!response.ok) throw new Error("Failed to fetch stars");
      const result = await response.json();
      return result.data as Star[];
    },
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24h
  });

  // Fetch sky paths for all objects
  const { data: skyPaths, isLoading } = useQuery({
    queryKey: ["sky-paths", objectIds, observerLat, observerLon, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (objectIds.length === 0) return [];
      const promises = objectIds.map(async (id) => {
        const params = new URLSearchParams();
        params.set("lat", observerLat.toString());
        params.set("lon", observerLon.toString());
        params.set("start_date", startDate.toISOString());
        params.set("end_date", endDate.toISOString());
        params.set("step_hours", "1.0");

        const response = await fetch(
          `/api/sky-visualizers/objects/${id}/sky-path?${params}`
        );
        if (!response.ok) return { id, points: [] };
        const result = await response.json();
        return { id, points: result.data as SkyPathPoint[] };
      });
      return Promise.all(promises);
    },
    enabled: objectIds.length > 0,
  });

  // Colors for objects
  const colors = useMemo(() => ["#00ff00", "#ff00ff", "#00ffff", "#ffff00", "#ff0000"], []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle Resize
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight || 600;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2 + pan.x;
    const centerY = height / 2 + pan.y;
    const baseRadius = Math.min(width, height) / 2 - 20;
    const radius = baseRadius * zoom;

    // Clear canvas
    ctx.fillStyle = "#000011";
    ctx.fillRect(0, 0, width, height);

    // Clip to circle for clean edges (optional, maybe skip to see full sky if zoomed)
    // ctx.save();
    // ctx.beginPath();
    // ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    // ctx.clip();

    // Draw horizon circle
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw altitude rings (30, 60 deg)
    [30, 60].forEach(alt => {
      const r = (radius * (90 - alt)) / 90;
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
      ctx.stroke();
    });

    // Draw Cardinal Directions
    ctx.fillStyle = "#fff";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const dirs = [
      { label: "N", az: 0 },
      { label: "E", az: 90 },
      { label: "S", az: 180 },
      { label: "W", az: 270 },
    ];
    dirs.forEach(d => {
        const angle = (d.az - 90) * Math.PI / 180; // Canvas 0 is right (East), but Az 0 is North (Up/Top).
        // Stereographic projection usually: North Up? Or Zenith Up? 
        // Standard: North Up, East Left (Celestial) or East Right (Map)?
        // Usually for sky maps: North Up, East Left.
        // Let's stick to Azimuth logic: 0=N, 90=E, 180=S, 270=W.
        // On canvas (y down): N=(0, -r), S=(0, r), E=(r, 0), W=(-r, 0).
        // wait, Az 90 is East.
        
        // Standard Alt/Az projection:
        // x = r * sin(az)
        // y = -r * cos(az)  (since y is down)
        
        const r = radius + 15;
        const azRad = d.az * Math.PI / 180;
        const x = centerX + r * Math.sin(azRad);
        const y = centerY - r * Math.cos(azRad);
        ctx.fillText(d.label, x, y);
    });

    // Helper to project Alt/Az to x,y
    const project = (alt: number, az: number) => {
        const r = (radius * (90 - alt)) / 90;
        const azRad = az * Math.PI / 180;
        const x = centerX + r * Math.sin(azRad);
        const y = centerY - r * Math.cos(azRad);
        return { x, y };
    };

    // Draw Stars
    if (stars) {
        stars.forEach(star => {
            // Convert RA/Dec to Alt/Az at startDate
            const raRad = star.ra * Math.PI / 180;
            const decRad = star.dec * Math.PI / 180;
            try {
                const { altitude, azimuth } = equatorialToHorizontal(
                    raRad, 
                    decRad, 
                    startDate, 
                    observerLat, 
                    observerLon
                );
                const altDeg = altitude * 180 / Math.PI;
                const azDeg = azimuth * 180 / Math.PI;

                if (altDeg > 0) {
                    const { x, y } = project(altDeg, azDeg);
                    
                    // Size based on magnitude (smaller mag = brighter = bigger)
                    // Mag -1 -> size 3, Mag 6 -> size 0.5
                    const size = Math.max(0.5, 3 - star.magnitude * 0.4);
                    
                    ctx.fillStyle = "#fff";
                    // Simple color based on BV if available
                    if (star.bv !== null) {
                        if (star.bv < 0.5) ctx.fillStyle = "#aaf"; // Blue-ish
                        else if (star.bv > 1.5) ctx.fillStyle = "#faa"; // Red-ish
                        else if (star.bv > 0.8) ctx.fillStyle = "#ff0"; // Yellow-ish
                    }
                    
                    ctx.beginPath();
                    ctx.arc(x, y, size * zoom, 0, 2 * Math.PI);
                    ctx.fill();
                }
            } catch (e) {
                // ignore errors in conversion
            }
        });
    }

    // Draw Paths
    if (skyPaths) {
        skyPaths.forEach((pathData, idx) => {
            const color = colors[idx % colors.length];
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();

            let first = true;
            pathData.points.forEach(p => {
                if (!p.visible) {
                    first = true; 
                    return;
                }
                const { x, y } = project(p.alt, p.az);
                if (first) {
                    ctx.moveTo(x, y);
                    first = false;
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();

            // Draw current position marker (last point)
            // Actually path is over range. "Current" is start of path usually? Or specific time?
            // The sky path endpoint generates from Start to End.
            // If StartDate is "Now", then the first point is "Now".
            // Let's draw the point closest to "Now" (Start Date).
            if (pathData.points.length > 0) {
                const p = pathData.points[0]; // Start point
                if (p.visible) {
                    const { x, y } = project(p.alt, p.az);
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(x, y, 4 * zoom, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Label
                    ctx.fillStyle = color;
                    ctx.font = "10px sans-serif";
                    ctx.fillText(`Obj ${pathData.id}`, x + 8, y);
                }
            }
        });
    }

    // ctx.restore();

  }, [stars, skyPaths, observerLat, observerLon, startDate, zoom, pan]);

  // Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
      const scale = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => Math.max(0.5, Math.min(5, z * scale)));
  };

  if (isLoading && objectIds.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] bg-black/5 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Calculating sky paths...</p>
      </div>
    );
  }

  return (
    <div className="relative group">
        <canvas
            ref={canvasRef}
            className="w-full h-[600px] bg-black cursor-move"
            style={{ minHeight: "600px" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        />
        
        <div className="absolute top-4 right-4 flex flex-col gap-2 bg-black/50 p-2 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={() => setZoom(z => z * 1.2)}>
                    <ZoomIn className="h-4 w-4 text-white" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setZoom(z => z / 1.2)}>
                    <ZoomOut className="h-4 w-4 text-white" />
                </Button>
            </div>
            <Button size="icon" variant="ghost" onClick={() => { setZoom(1); setPan({x:0,y:0}); }}>
                <RotateCcw className="h-4 w-4 text-white" />
            </Button>
        </div>

        <div className="absolute bottom-4 left-4 text-white/50 text-xs pointer-events-none">
            Observer: {observerLat.toFixed(2)}°, {observerLon.toFixed(2)}°
        </div>
    </div>
  );
}
