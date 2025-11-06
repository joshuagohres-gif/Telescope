import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { SystemStatus } from "@shared/schema";
import { Crosshair, Navigation } from "lucide-react";

export function TelescopeViewport() {
  const { data: status } = useQuery<SystemStatus>({
    queryKey: ["/api/telescope/status"],
    refetchInterval: 1000, // Refresh every second
  });

  const telescope = status?.telescope;
  const position = telescope?.position;

  const formatCoordinate = (value: number | undefined, decimals = 2) => {
    return value?.toFixed(decimals) ?? "--";
  };

  const formatRA = (ra: number | undefined) => {
    if (ra === undefined) return "--h --m --s";
    const hours = Math.floor(ra);
    const minutes = Math.floor((ra - hours) * 60);
    const seconds = Math.floor(((ra - hours) * 60 - minutes) * 60);
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  const formatDec = (dec: number | undefined) => {
    if (dec === undefined) return "--° --' --\"";
    const sign = dec >= 0 ? "+" : "-";
    const absDec = Math.abs(dec);
    const degrees = Math.floor(absDec);
    const minutes = Math.floor((absDec - degrees) * 60);
    const seconds = Math.floor(((absDec - degrees) * 60 - minutes) * 60);
    return `${sign}${degrees.toString().padStart(2, '0')}° ${minutes.toString().padStart(2, '0')}' ${seconds.toString().padStart(2, '0')}"`;
  };

  return (
    <Card className="p-6" data-testid="card-telescope-viewport">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Telescope Position</h2>
        </div>
        {telescope?.currentTarget && (
          <Badge variant="secondary" className="gap-2" data-testid="badge-current-target">
            <Navigation className="w-3 h-3" />
            {telescope.currentTarget}
          </Badge>
        )}
      </div>

      {/* Visual Representation */}
      <div className="relative w-full aspect-video bg-gradient-to-b from-card to-muted/30 rounded-md border border-border mb-6 overflow-hidden">
        {/* Star field background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-[10%] left-[20%] w-1 h-1 bg-white rounded-full" />
          <div className="absolute top-[30%] left-[70%] w-1 h-1 bg-white rounded-full" />
          <div className="absolute top-[60%] left-[40%] w-0.5 h-0.5 bg-white rounded-full" />
          <div className="absolute top-[80%] left-[60%] w-1 h-1 bg-white rounded-full" />
          <div className="absolute top-[25%] left-[50%] w-0.5 h-0.5 bg-white rounded-full" />
          <div className="absolute top-[70%] left-[15%] w-1 h-1 bg-white rounded-full" />
          <div className="absolute top-[45%] left-[85%] w-0.5 h-0.5 bg-white rounded-full" />
        </div>

        {/* Crosshair center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-primary rounded-full opacity-50" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-primary rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-0.5 bg-primary/50" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-primary/50" />
          </div>
        </div>

        {/* Status overlay */}
        <div className="absolute top-3 right-3">
          {telescope?.slewing && (
            <Badge variant="default" className="bg-telescope-slewing text-white gap-2" data-testid="badge-slewing">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Slewing
            </Badge>
          )}
          {telescope?.tracking && !telescope?.slewing && (
            <Badge variant="default" className="bg-telescope-tracking text-white gap-2" data-testid="badge-tracking">
              <div className="w-2 h-2 bg-white rounded-full" />
              Tracking
            </Badge>
          )}
          {telescope?.parked && (
            <Badge variant="default" className="bg-telescope-parked text-white" data-testid="badge-parked">
              Parked
            </Badge>
          )}
        </div>
      </div>

      {/* Coordinate Readouts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Equatorial</h3>
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">RA:</span>
              <span className="text-lg font-mono font-medium" data-testid="text-ra">
                {formatRA(position?.ra)}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Dec:</span>
              <span className="text-lg font-mono font-medium" data-testid="text-dec">
                {formatDec(position?.dec)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Horizontal</h3>
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Alt:</span>
              <span className="text-lg font-mono font-medium" data-testid="text-alt">
                {formatCoordinate(position?.alt)}°
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Az:</span>
              <span className="text-lg font-mono font-medium" data-testid="text-az">
                {formatCoordinate(position?.az)}°
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
