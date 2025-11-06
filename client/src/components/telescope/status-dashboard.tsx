import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { SystemStatus } from "@shared/schema";
import { Telescope, Camera, Focus, Wifi, WifiOff, Circle } from "lucide-react";

export function StatusDashboard() {
  const { data: status, isLoading } = useQuery<SystemStatus>({
    queryKey: ["/api/telescope/status"],
    refetchInterval: 1000,
  });

  if (isLoading) {
    return (
      <Card className="p-6" data-testid="card-status-dashboard">
        <div className="space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
      </Card>
    );
  }

  const getConnectionBadge = (connected: boolean, type?: string) => {
    if (!connected) {
      return (
        <Badge variant="secondary" className="gap-1">
          <WifiOff className="w-3 h-3" />
          Disconnected
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 bg-telescope-connected/10 text-telescope-connected border-telescope-connected/30">
        <Wifi className="w-3 h-3" />
        {type ? type.toUpperCase() : "Connected"}
      </Badge>
    );
  };

  const getStatusIndicator = (status: string, color: string) => {
    return (
      <div className="flex items-center gap-2">
        <Circle className={`w-2 h-2 fill-${color} text-${color}`} />
        <span className="text-sm capitalize">{status}</span>
      </div>
    );
  };

  return (
    <Card className="p-6 h-fit sticky top-4" data-testid="card-status-dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">System Status</h2>
          <p className="text-xs text-muted-foreground">
            Last updated: {status?.lastUpdate ? new Date(status.lastUpdate).toLocaleTimeString() : "Never"}
          </p>
        </div>

        {/* Telescope Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Telescope className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-sm">Telescope</h3>
            </div>
            {getConnectionBadge(status?.telescope.connected ?? false, status?.telescope.connectionType)}
          </div>

          {status?.telescope.connected && (
            <div className="space-y-2 pl-6 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                {status.telescope.parked && getStatusIndicator("parked", "telescope-parked")}
                {status.telescope.slewing && !status.telescope.parked && getStatusIndicator("slewing", "telescope-slewing")}
                {status.telescope.tracking && !status.telescope.slewing && !status.telescope.parked && getStatusIndicator("tracking", "telescope-tracking")}
                {!status.telescope.tracking && !status.telescope.slewing && !status.telescope.parked && getStatusIndicator("idle", "telescope-idle")}
              </div>
              
              {status.telescope.slewRate && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Slew Rate:</span>
                  <span className="font-mono" data-testid="text-slew-rate">{status.telescope.slewRate}x</span>
                </div>
              )}

              {status.telescope.pierSide && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pier Side:</span>
                  <span className="font-mono capitalize" data-testid="text-pier-side">{status.telescope.pierSide}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Camera Status */}
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-sm">Camera</h3>
            </div>
            {getConnectionBadge(status?.camera.connected ?? false)}
          </div>

          {status?.camera.connected && (
            <div className="space-y-2 pl-6 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                {status.camera.exposing 
                  ? getStatusIndicator("exposing", "primary")
                  : getStatusIndicator("idle", "telescope-idle")
                }
              </div>

              {status.camera.temperature !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Temperature:</span>
                  <span className="font-mono" data-testid="text-camera-status-temp">
                    {status.camera.temperature.toFixed(1)}°C
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cooler:</span>
                <Badge variant={status.camera.coolerOn ? "default" : "secondary"} className="text-xs">
                  {status.camera.coolerOn ? "ON" : "OFF"}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Settings:</span>
                <span className="font-mono text-xs" data-testid="text-camera-settings">
                  {status.camera.exposureTime}s @ {status.camera.gain} gain, {status.camera.binning}x{status.camera.binning}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Focuser Status */}
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Focus className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-sm">Focuser</h3>
            </div>
            {getConnectionBadge(status?.focuser.connected ?? false)}
          </div>

          {status?.focuser.connected && (
            <div className="space-y-2 pl-6 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                {status.focuser.moving 
                  ? getStatusIndicator("moving", "primary")
                  : getStatusIndicator("idle", "telescope-idle")
                }
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Position:</span>
                <span className="font-mono" data-testid="text-focuser-status-position">
                  {status.focuser.position} / {status.focuser.maxPosition}
                </span>
              </div>

              {status.focuser.temperature !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Temperature:</span>
                  <span className="font-mono" data-testid="text-focuser-status-temp">
                    {status.focuser.temperature.toFixed(1)}°C
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
