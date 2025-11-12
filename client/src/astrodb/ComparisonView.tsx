import { type Device } from "@/hooks/use-astrodb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

interface ComparisonViewProps {
  devices: Device[];
  onClose: () => void;
}

export function ComparisonView({ devices, onClose }: ComparisonViewProps) {
  // Build list of all spec keys across all devices
  const allSpecs = [
    { key: "category", label: "Category" },
    { key: "manufacturer", label: "Manufacturer" },
    { key: "apertureMm", label: "Aperture", unit: "mm" },
    { key: "focalLengthMm", label: "Focal Length", unit: "mm" },
    { key: "focalRatio", label: "Focal Ratio", prefix: "f/" },
    { key: "imageCircleMm", label: "Image Circle", unit: "mm" },
    { key: "sensorWidth", label: "Sensor Width", unit: "mm", format: (d: Device) => d.sensorWidthMm?.toFixed(1) },
    { key: "sensorHeight", label: "Sensor Height", unit: "mm", format: (d: Device) => d.sensorHeightMm?.toFixed(1) },
    { key: "pixelSizeUm", label: "Pixel Size", unit: "µm" },
    { key: "backfocusMm", label: "Backfocus", unit: "mm" },
    { key: "interface", label: "Interface" },
  ];

  const getValue = (device: Device, spec: any) => {
    if (spec.format) {
      return spec.format(device);
    }
    const value = (device as any)[spec.key];
    if (value === null || value === undefined) return null;
    if (spec.prefix) return `${spec.prefix}${value}`;
    if (spec.unit) return `${value}${spec.unit}`;
    return value;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Device Comparison</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left border-b font-semibold bg-muted/50 sticky left-0 z-10">
                  Specification
                </th>
                {devices.map((device) => (
                  <th
                    key={device.id}
                    className="p-3 text-left border-b border-l font-normal min-w-[200px]"
                  >
                    <div>
                      <p className="font-semibold text-sm">{device.model}</p>
                      <p className="text-xs text-muted-foreground">
                        {device.manufacturer}
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        {device.category}
                      </Badge>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allSpecs.map((spec, index) => {
                // Check if any device has this spec
                const hasSpec = devices.some(
                  (d) => getValue(d, spec) !== null && getValue(d, spec) !== undefined
                );
                if (!hasSpec) return null;

                return (
                  <tr key={spec.key} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                    <td className="p-3 border-b font-medium text-sm sticky left-0 z-10 bg-background">
                      {spec.label}
                    </td>
                    {devices.map((device) => {
                      const value = getValue(device, spec);
                      return (
                        <td
                          key={device.id}
                          className="p-3 border-b border-l text-sm"
                        >
                          {value !== null && value !== undefined ? (
                            <span>{value}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Compatibility indicators (if applicable) */}
        {devices.length >= 2 && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-semibold mb-3 text-sm">Quick Compatibility Checks</h4>
            <div className="space-y-2 text-sm">
              {checkBackfocusCompatibility(devices)}
              {checkImageCircleCompatibility(devices)}
              {checkInterfaceCompatibility(devices)}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper functions for compatibility checks
function checkBackfocusCompatibility(devices: Device[]) {
  const scope = devices.find((d) => d.category === "Telescope" && d.backfocusMm);
  const camera = devices.find((d) => d.category === "Camera" && d.backfocusMm);

  if (scope && camera) {
    const compatible = (camera.backfocusMm || 0) <= (scope.backfocusMm || 0);
    return (
      <div className="flex items-center gap-2">
        {compatible ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <X className="w-4 h-4 text-destructive" />
        )}
        <span>
          Backfocus: Camera requires {camera.backfocusMm}mm, Telescope provides{" "}
          {scope.backfocusMm}mm {compatible ? "✓" : "(Insufficient)"}
        </span>
      </div>
    );
  }
  return null;
}

function checkImageCircleCompatibility(devices: Device[]) {
  const scope = devices.find((d) => d.category === "Telescope" && d.imageCircleMm);
  const camera = devices.find(
    (d) =>
      d.category === "Camera" &&
      d.sensorWidthMm &&
      d.sensorHeightMm
  );

  if (scope && camera) {
    const sensorDiagonal = Math.sqrt(
      (camera.sensorWidthMm || 0) ** 2 + (camera.sensorHeightMm || 0) ** 2
    );
    const compatible = sensorDiagonal <= (scope.imageCircleMm || 0);

    return (
      <div className="flex items-center gap-2">
        {compatible ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <X className="w-4 h-4 text-destructive" />
        )}
        <span>
          Image Circle: Sensor diagonal {sensorDiagonal.toFixed(1)}mm,
          Telescope covers {scope.imageCircleMm}mm {compatible ? "✓" : "(Vignetting likely)"}
        </span>
      </div>
    );
  }
  return null;
}

function checkInterfaceCompatibility(devices: Device[]) {
  const interfaces = devices
    .map((d) => d.interface)
    .filter((i): i is string => !!i);

  if (interfaces.length >= 2) {
    // Simple check: if they mention the same interface type
    const commonInterface = interfaces.every(
      (i) => interfaces[0] && i.includes(interfaces[0].split(" ")[0])
    );

    if (commonInterface) {
      return (
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <span>Interface: Compatible connections detected</span>
        </div>
      );
    }
  }
  return null;
}
