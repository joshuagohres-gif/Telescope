import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";

interface SkyPathPoint {
  t: number;
  ra: number;
  dec: number;
  alt: number;
  az: number;
  magnitude?: number;
  distance?: number;
  visible: boolean;
}

interface SkyPathViewProps {
  objectId: number;
  observerLat: number;
  observerLon: number;
  startDate: Date;
  endDate: Date;
}

export function SkyPathView({
  objectId,
  observerLat,
  observerLon,
  startDate,
  endDate,
}: SkyPathViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: skyPath, isLoading } = useQuery({
    queryKey: [
      "sky-path",
      objectId,
      observerLat,
      observerLon,
      startDate.toISOString(),
      endDate.toISOString(),
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("lat", observerLat.toString());
      params.set("lon", observerLon.toString());
      params.set("start_date", startDate.toISOString());
      params.set("end_date", endDate.toISOString());
      params.set("step_hours", "1.0");

      const response = await fetch(
        `/api/sky-visualizers/objects/${objectId}/sky-path?${params}`
      );
      if (!response.ok) throw new Error("Failed to fetch sky path");
      const result = await response.json();
      return result.data as SkyPathPoint[];
    },
    enabled: !!objectId,
  });

  useEffect(() => {
    if (!canvasRef.current || !skyPath) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight || 600;

    // Clear canvas
    ctx.fillStyle = "#000011";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw horizon circle
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 20;

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw cardinal directions
    ctx.fillStyle = "#fff";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("N", centerX, centerY - radius - 10);
    ctx.fillText("S", centerX, centerY + radius + 20);
    ctx.fillText("E", centerX + radius + 20, centerY);
    ctx.fillText("W", centerX - radius - 20, centerY);

    // Draw altitude circles
    for (let alt = 30; alt < 90; alt += 30) {
      const altRadius = (radius * (90 - alt)) / 90;
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, altRadius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw sky path
    if (skyPath.length > 0) {
      ctx.strokeStyle = "#0f0";
      ctx.lineWidth = 2;
      ctx.beginPath();

      let firstPoint = true;
      for (const point of skyPath) {
        if (!point.visible) continue;

        // Convert alt/az to canvas coordinates
        const altRad = (point.alt * Math.PI) / 180;
        const azRad = (point.az * Math.PI) / 180;

        // Stereographic projection
        const r = (radius * (90 - point.alt)) / 90;
        const x = centerX + r * Math.sin(azRad);
        const y = centerY - r * Math.cos(azRad);

        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Draw current position
      if (skyPath.length > 0) {
        const lastPoint = skyPath[skyPath.length - 1];
        if (lastPoint.visible) {
          const altRad = (lastPoint.alt * Math.PI) / 180;
          const azRad = (lastPoint.az * Math.PI) / 180;
          const r = (radius * (90 - lastPoint.alt)) / 90;
          const x = centerX + r * Math.sin(azRad);
          const y = centerY - r * Math.cos(azRad);

          ctx.fillStyle = "#f00";
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }
  }, [skyPath]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading sky path...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] gap-4 p-8">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[600px] bg-background"
      style={{ minHeight: "600px" }}
    />
  );
}
