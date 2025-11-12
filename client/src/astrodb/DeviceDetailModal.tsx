import { type Device } from "@/hooks/use-astrodb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface DeviceDetailModalProps {
  device: Device;
  onClose: () => void;
}

export function DeviceDetailModal({ device, onClose }: DeviceDetailModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{device.model}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                {device.manufacturer && (
                  <span className="text-muted-foreground">{device.manufacturer}</span>
                )}
                <Badge variant="secondary">{device.category}</Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-6">
          {/* Optical Specifications */}
          {(device.apertureMm || device.focalLengthMm || device.focalRatio || device.imageCircleMm) && (
            <div>
              <h3 className="font-semibold mb-3">Optical Specifications</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {device.apertureMm && (
                  <div>
                    <span className="text-muted-foreground">Aperture:</span>
                    <p className="font-medium">{device.apertureMm}mm</p>
                  </div>
                )}
                {device.focalLengthMm && (
                  <div>
                    <span className="text-muted-foreground">Focal Length:</span>
                    <p className="font-medium">{device.focalLengthMm}mm</p>
                  </div>
                )}
                {device.focalRatio && (
                  <div>
                    <span className="text-muted-foreground">Focal Ratio:</span>
                    <p className="font-medium">f/{device.focalRatio}</p>
                  </div>
                )}
                {device.imageCircleMm && (
                  <div>
                    <span className="text-muted-foreground">Image Circle:</span>
                    <p className="font-medium">{device.imageCircleMm}mm</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Camera/Sensor Specifications */}
          {(device.sensorWidthMm || device.sensorHeightMm || device.pixelSizeUm) && (
            <div>
              <h3 className="font-semibold mb-3">Sensor Specifications</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {device.sensorWidthMm && device.sensorHeightMm && (
                  <div>
                    <span className="text-muted-foreground">Sensor Size:</span>
                    <p className="font-medium">
                      {device.sensorWidthMm.toFixed(1)} × {device.sensorHeightMm.toFixed(1)}mm
                    </p>
                  </div>
                )}
                {device.pixelSizeUm && (
                  <div>
                    <span className="text-muted-foreground">Pixel Size:</span>
                    <p className="font-medium">{device.pixelSizeUm}µm</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mechanical Specifications */}
          {(device.backfocusMm || device.interface) && (
            <div>
              <h3 className="font-semibold mb-3">Mechanical Specifications</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {device.backfocusMm && (
                  <div>
                    <span className="text-muted-foreground">Backfocus Required:</span>
                    <p className="font-medium">{device.backfocusMm}mm</p>
                  </div>
                )}
                {device.interface && (
                  <div>
                    <span className="text-muted-foreground">Interface:</span>
                    <p className="font-medium">{device.interface}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {device.notes && (
            <div>
              <h3 className="font-semibold mb-3">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {device.notes}
              </p>
            </div>
          )}

          {/* Links */}
          <div className="flex gap-2">
            {device.specUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={device.specUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Specifications
                </a>
              </Button>
            )}
            {device.imageUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={device.imageUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Product Image
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
