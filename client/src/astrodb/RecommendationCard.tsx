import { type Device } from "@/hooks/use-astrodb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DeviceDetailModal } from "./DeviceDetailModal";

interface RecommendationCardProps {
  device: Device;
  score: number;
  reasons: string[];
  warnings: string[];
}

export function RecommendationCard({
  device,
  score,
  reasons,
  warnings,
}: RecommendationCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-orange-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    return "Fair Match";
  };

  return (
    <>
      <Card className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-lg">{device.model}</h3>
                <Badge variant="secondary">{device.category}</Badge>
              </div>
              {device.manufacturer && (
                <p className="text-sm text-muted-foreground mt-1">
                  {device.manufacturer}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                {score}
              </div>
              <div className="text-xs text-muted-foreground">
                {getScoreLabel(score)}
              </div>
            </div>
          </div>

          {/* Compatibility Score Bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Compatibility Score</span>
              <span className="font-medium">{score}/100</span>
            </div>
            <Progress value={score} className="h-2" />
          </div>

          {/* Key Specs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {device.apertureMm && (
              <div>
                <span className="text-muted-foreground block">Aperture</span>
                <span className="font-medium">{device.apertureMm}mm</span>
              </div>
            )}
            {device.focalRatio && (
              <div>
                <span className="text-muted-foreground block">Focal Ratio</span>
                <span className="font-medium">f/{device.focalRatio}</span>
              </div>
            )}
            {device.sensorWidthMm && device.sensorHeightMm && (
              <div>
                <span className="text-muted-foreground block">Sensor</span>
                <span className="font-medium">
                  {device.sensorWidthMm.toFixed(1)}×{device.sensorHeightMm.toFixed(1)}mm
                </span>
              </div>
            )}
            {device.pixelSizeUm && (
              <div>
                <span className="text-muted-foreground block">Pixel Size</span>
                <span className="font-medium">{device.pixelSizeUm}µm</span>
              </div>
            )}
          </div>

          {/* Compatibility Reasons */}
          {reasons.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Why This Works
              </h4>
              <ul className="space-y-1">
                {reasons.map((reason, index) => (
                  <li
                    key={index}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                Considerations
              </h4>
              <ul className="space-y-1">
                {warnings.map((warning, index) => (
                  <li
                    key={index}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action */}
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowDetails(true)}>
              <Eye className="w-4 h-4 mr-2" />
              View Full Specifications
            </Button>
          </div>
        </div>
      </Card>

      {showDetails && (
        <DeviceDetailModal device={device} onClose={() => setShowDetails(false)} />
      )}
    </>
  );
}
