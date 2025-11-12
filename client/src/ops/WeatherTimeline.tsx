import { useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CloudRain, Eye, Droplets, Moon } from "lucide-react";

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

interface WeatherTimelineProps {
  forecasts: MeteoForecast[];
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", { hour: "numeric" });
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function WeatherTimeline({ forecasts }: WeatherTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!forecasts || forecasts.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 40, right: 60, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    // Limit to 48 hours
    const displayForecasts = forecasts.slice(0, 48);
    const xStep = chartWidth / (displayForecasts.length - 1);

    // === CLOUD COVER AREA ===
    ctx.fillStyle = "rgba(156, 163, 175, 0.3)"; // Gray for clouds
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);

    displayForecasts.forEach((f, i) => {
      const x = padding.left + i * xStep;
      const cloudHeight = (f.cloudPct / 100) * chartHeight;
      const y = padding.top + chartHeight - cloudHeight;

      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.closePath();
    ctx.fill();

    // === TRANSPARENCY LINE (if available) ===
    const hasTransparency = displayForecasts.some(f => f.transparencyIdx !== null);
    if (hasTransparency) {
      ctx.strokeStyle = "rgba(59, 130, 246, 0.8)"; // Blue for transparency
      ctx.lineWidth = 2;
      ctx.beginPath();

      displayForecasts.forEach((f, i) => {
        if (f.transparencyIdx !== null) {
          const x = padding.left + i * xStep;
          const transparencyHeight = (f.transparencyIdx / 10) * (chartHeight * 0.6);
          const y = padding.top + chartHeight - transparencyHeight;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      });

      ctx.stroke();
    }

    // === SEEING LINE (if available) ===
    const hasSeeing = displayForecasts.some(f => f.seeingArcsec !== null);
    if (hasSeeing) {
      ctx.strokeStyle = "rgba(234, 179, 8, 0.8)"; // Yellow for seeing
      ctx.lineWidth = 2;
      ctx.beginPath();

      displayForecasts.forEach((f, i) => {
        if (f.seeingArcsec !== null) {
          const x = padding.left + i * xStep;
          // Invert seeing - lower arcsec = better (higher on chart)
          const seeingHeight = (1 - Math.min(f.seeingArcsec / 5, 1)) * (chartHeight * 0.4);
          const y = padding.top + chartHeight - seeingHeight;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      });

      ctx.stroke();
    }

    // === DEW RISK BARS ===
    displayForecasts.forEach((f, i) => {
      const dewMargin = f.tempC - f.dewpointC;
      const x = padding.left + i * xStep;

      let color;
      if (dewMargin < 1) color = "rgba(239, 68, 68, 0.7)"; // Red
      else if (dewMargin < 2) color = "rgba(249, 115, 22, 0.7)"; // Orange
      else if (dewMargin < 4) color = "rgba(234, 179, 8, 0.7)"; // Yellow
      else color = "rgba(34, 197, 94, 0.3)"; // Green

      const dewHeight = Math.min(dewMargin / 10, 1) * (chartHeight * 0.2);
      const y = padding.top + chartHeight - dewHeight;
      const barWidth = Math.max(2, xStep * 0.6);

      ctx.fillStyle = color;
      ctx.fillRect(x - barWidth / 2, y, barWidth, dewHeight);
    });

    // === MOON PHASE INDICATORS ===
    displayForecasts.forEach((f, i) => {
      if (f.moonAltDeg > 0) {
        const x = padding.left + i * xStep;
        const moonSize = (f.moonIllum * 8) + 3;
        const y = padding.top - 15;

        ctx.fillStyle = `rgba(250, 204, 21, ${0.3 + f.moonIllum * 0.7})`;
        ctx.beginPath();
        ctx.arc(x, y, moonSize, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // === GRID LINES ===
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;

    // Horizontal grid
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid (every 6 hours)
    for (let i = 0; i < displayForecasts.length; i += 6) {
      const x = padding.left + i * xStep;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }

    // === AXES ===
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    // === LABELS ===
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";

    // X-axis labels (time)
    displayForecasts.forEach((f, i) => {
      if (i % 6 === 0) {
        const x = padding.left + i * xStep;
        ctx.fillText(formatTime(f.ts), x, padding.top + chartHeight + 20);

        // Date labels
        if (i === 0 || i === 24) {
          ctx.fillText(formatDate(f.ts), x, padding.top + chartHeight + 40);
        }
      }
    });

    // Y-axis labels
    ctx.textAlign = "right";
    ctx.fillText("100%", padding.left - 10, padding.top + 5);
    ctx.fillText("75%", padding.left - 10, padding.top + chartHeight * 0.25 + 5);
    ctx.fillText("50%", padding.left - 10, padding.top + chartHeight * 0.5 + 5);
    ctx.fillText("25%", padding.left - 10, padding.top + chartHeight * 0.75 + 5);
    ctx.fillText("0%", padding.left - 10, padding.top + chartHeight + 5);

    // === TITLE ===
    ctx.fillStyle = "#f3f4f6";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("48-Hour Forecast Timeline", padding.left, 25);

  }, [forecasts]);

  // Calculate quality bands
  const qualityBands = forecasts?.slice(0, 48).map(f => {
    const cloudScore = 100 - f.cloudPct;
    const transparencyScore = f.transparencyIdx ? f.transparencyIdx * 10 : 50;
    const seeingScore = f.seeingArcsec ? Math.max(0, 100 - f.seeingArcsec * 20) : 50;
    const dewScore = Math.min((f.tempC - f.dewpointC) * 10, 100);

    const avgScore = (cloudScore + transparencyScore + seeingScore + dewScore) / 4;

    let quality: "excellent" | "good" | "fair" | "poor";
    if (avgScore >= 80) quality = "excellent";
    else if (avgScore >= 60) quality = "good";
    else if (avgScore >= 40) quality = "fair";
    else quality = "poor";

    return { ts: f.ts, quality, score: Math.round(avgScore) };
  });

  const excellentPeriods = qualityBands?.filter(b => b.quality === "excellent").length || 0;
  const goodPeriods = qualityBands?.filter(b => b.quality === "good").length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Forecast Timeline
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              48-hour multi-factor visualization
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {excellentPeriods > 0 && (
              <Badge className="bg-green-500 text-white">
                {excellentPeriods}h Excellent
              </Badge>
            )}
            {goodPeriods > 0 && (
              <Badge className="bg-blue-500 text-white">
                {goodPeriods}h Good
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg p-4">
          <canvas
            ref={canvasRef}
            width={1000}
            height={300}
            className="w-full h-auto"
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 bg-gray-400 opacity-30 rounded" />
            <span>Cloud Cover</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-2 bg-blue-500 rounded" />
            <span>Transparency</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-2 bg-yellow-500 rounded" />
            <span>Seeing Quality</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded" style={{ background: "linear-gradient(to right, #ef4444, #eab308, #22c55e)" }} />
            <span>Dew Risk</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Moon className="w-4 h-4 text-yellow-400" />
            <span>Moon Visible</span>
          </div>
        </div>

        {/* Quality Bands */}
        <div className="mt-4">
          <div className="text-xs font-medium mb-2">Hourly Quality</div>
          <div className="flex gap-0.5 h-4 rounded overflow-hidden">
            {qualityBands?.map((band, i) => {
              const colors = {
                excellent: "#22c55e",
                good: "#3b82f6",
                fair: "#eab308",
                poor: "#ef4444",
              };
              return (
                <div
                  key={i}
                  className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: colors[band.quality] }}
                  title={`${formatTime(band.ts)}: ${band.quality} (${band.score})`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Now</span>
            <span>+24h</span>
            <span>+48h</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
