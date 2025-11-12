import { type Device } from "@/hooks/use-astrodb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, GitCompare, Check } from "lucide-react";

interface DeviceCardProps {
  device: Device;
  onViewDetails: () => void;
  onToggleComparison: () => void;
  isInComparison: boolean;
}

export function DeviceCard({
  device,
  onViewDetails,
  onToggleComparison,
  isInComparison,
}: DeviceCardProps) {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <Badge variant="secondary" className="mb-2">
              {device.category}
            </Badge>
            <h3 className="font-semibold text-lg line-clamp-1">
              {device.model}
            </h3>
            {device.manufacturer && (
              <p className="text-sm text-muted-foreground">
                {device.manufacturer}
              </p>
            )}
          </div>
        </div>

        {/* Specifications */}
        <div className="flex-1 space-y-2 text-sm">
          {device.apertureMm && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Aperture:</span>
              <span className="font-medium">{device.apertureMm}mm</span>
            </div>
          )}
          {device.focalLengthMm && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Focal Length:</span>
              <span className="font-medium">{device.focalLengthMm}mm</span>
            </div>
          )}
          {device.focalRatio && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Focal Ratio:</span>
              <span className="font-medium">f/{device.focalRatio}</span>
            </div>
          )}
          {device.sensorWidthMm && device.sensorHeightMm && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sensor:</span>
              <span className="font-medium">
                {device.sensorWidthMm.toFixed(1)} × {device.sensorHeightMm.toFixed(1)}mm
              </span>
            </div>
          )}
          {device.pixelSizeUm && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pixel Size:</span>
              <span className="font-medium">{device.pixelSizeUm}µm</span>
            </div>
          )}
          {device.backfocusMm && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Backfocus:</span>
              <span className="font-medium">{device.backfocusMm}mm</span>
            </div>
          )}
          {device.interface && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Interface:</span>
              <span className="font-medium">{device.interface}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Details
          </Button>
          <Button
            variant={isInComparison ? "default" : "outline"}
            size="sm"
            onClick={onToggleComparison}
            className="flex-1"
          >
            {isInComparison ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Selected
              </>
            ) : (
              <>
                <GitCompare className="w-4 h-4 mr-2" />
                Compare
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
