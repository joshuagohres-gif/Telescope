import { type SatellitePass } from "@/hooks/use-astrodb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Sun, Moon, Clock } from "lucide-react";

interface PassDetailsCardProps {
  pass: SatellitePass;
  index: number;
}

export function PassDetailsCard({ pass, index }: PassDetailsCardProps) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getBrightnessLabel = (mag: number | null) => {
    if (mag === null) return { label: "Unknown", color: "secondary" };
    if (mag < -2) return { label: "Very Bright", color: "default" };
    if (mag < 0) return { label: "Bright", color: "default" };
    if (mag < 2) return { label: "Moderate", color: "secondary" };
    return { label: "Faint", color: "secondary" };
  };

  const getDirectionLabel = (azimuth: number) => {
    if (azimuth < 22.5 || azimuth >= 337.5) return "N";
    if (azimuth < 67.5) return "NE";
    if (azimuth < 112.5) return "E";
    if (azimuth < 157.5) return "SE";
    if (azimuth < 202.5) return "S";
    if (azimuth < 247.5) return "SW";
    if (azimuth < 292.5) return "W";
    return "NW";
  };

  const brightness = getBrightnessLabel(pass.maxMag);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">Pass #{index + 1}</span>
            <Badge variant={brightness.color as any}>{brightness.label}</Badge>
            {pass.maxMag !== null && (
              <span className="text-sm text-muted-foreground">
                Mag: {pass.maxMag.toFixed(1)}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDate(pass.riseTime)}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(pass.durationSec)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        {/* Rise */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground">
            <ArrowUp className="w-3 h-3" />
            <span className="font-medium">Rise</span>
          </div>
          <p className="font-mono">{formatTime(pass.riseTime)}</p>
          <p className="text-xs text-muted-foreground">
            {getDirectionLabel(pass.riseAz)} ({pass.riseAz.toFixed(0)}°)
          </p>
        </div>

        {/* Maximum */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Sun className="w-3 h-3" />
            <span className="font-medium">Max</span>
          </div>
          <p className="font-mono">{formatTime(pass.maxTime)}</p>
          <p className="text-xs text-muted-foreground">
            {pass.maxAlt.toFixed(0)}° alt, {getDirectionLabel(pass.maxAz)} ({pass.maxAz.toFixed(0)}°)
          </p>
        </div>

        {/* Set */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground">
            <ArrowDown className="w-3 h-3" />
            <span className="font-medium">Set</span>
          </div>
          <p className="font-mono">{formatTime(pass.setTime)}</p>
          <p className="text-xs text-muted-foreground">
            {getDirectionLabel(pass.setAz)} ({pass.setAz.toFixed(0)}°)
          </p>
        </div>
      </div>
    </Card>
  );
}
