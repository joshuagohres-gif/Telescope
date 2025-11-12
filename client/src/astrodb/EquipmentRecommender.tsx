import { useState, useMemo } from "react";
import { useDevices, type Device } from "@/hooks/use-astrodb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Telescope, Camera, Focus, Lightbulb } from "lucide-react";
import { RecommendationCard } from "./RecommendationCard";

export function EquipmentRecommender() {
  // Current setup
  const [currentTelescopeId, setCurrentTelescopeId] = useState<number | null>(null);
  const [currentCameraId, setCurrentCameraId] = useState<number | null>(null);

  // What they're looking for
  const [lookingFor, setLookingFor] = useState<"Camera" | "Telescope" | "Focuser" | "">("Camera");

  // Budget constraint
  const [maxBudget, setMaxBudget] = useState("");

  // Fetch devices
  const { data: telescopesData } = useDevices({ category: "Telescope", pageSize: 100 });
  const { data: camerasData } = useDevices({ category: "Camera", pageSize: 100 });
  const { data: candidatesData } = useDevices({
    category: lookingFor || undefined,
    pageSize: 100,
  });

  const telescopes = telescopesData?.data || [];
  const cameras = camerasData?.data || [];
  const candidates = candidatesData?.data || [];

  const currentTelescope = telescopes.find((t) => t.id === currentTelescopeId);
  const currentCamera = cameras.find((c) => c.id === currentCameraId);

  // Calculate compatibility scores
  const recommendations = useMemo(() => {
    if (!lookingFor) return [];

    return candidates
      .map((device) => {
        const compatibility = calculateCompatibility(
          device,
          lookingFor,
          currentTelescope,
          currentCamera
        );
        return { device, ...compatibility };
      })
      .filter((rec) => rec.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10 recommendations
  }, [candidates, lookingFor, currentTelescope, currentCamera]);

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Equipment Recommendation Wizard
        </h3>

        <div className="space-y-4">
          {/* Current Setup */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Telescope (optional)</Label>
              <Select
                value={currentTelescopeId?.toString()}
                onValueChange={(value) => setCurrentTelescopeId(value ? parseInt(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your telescope..." />
                </SelectTrigger>
                <SelectContent>
                  {telescopes.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.model} ({t.manufacturer || "Unknown"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentTelescopeId && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setCurrentTelescopeId(null)}>
                  Clear selection
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Current Camera (optional)</Label>
              <Select
                value={currentCameraId?.toString()}
                onValueChange={(value) => setCurrentCameraId(value ? parseInt(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your camera..." />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.model} ({c.manufacturer || "Unknown"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentCameraId && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setCurrentCameraId(null)}>
                  Clear selection
                </Button>
              )}
            </div>
          </div>

          {/* What are you looking for? */}
          <div className="space-y-2">
            <Label>What equipment are you looking for?</Label>
            <Select
              value={lookingFor}
              onValueChange={(value) => setLookingFor(value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select equipment type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Camera">Camera</SelectItem>
                <SelectItem value="Telescope">Telescope</SelectItem>
                <SelectItem value="Focuser">Focuser</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Budget (optional) */}
          <div className="space-y-2">
            <Label>Maximum Budget (optional)</Label>
            <Input
              type="number"
              placeholder="Enter max budget in USD"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Recommendations */}
      {!lookingFor && (
        <Card className="p-8 text-center text-muted-foreground">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select what equipment you're looking for to see recommendations</p>
        </Card>
      )}

      {lookingFor && recommendations.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <p>No compatible equipment found.</p>
          <p className="text-sm mt-2">
            Try selecting your current telescope or camera to get better recommendations.
          </p>
        </Card>
      )}

      {lookingFor && recommendations.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-4">
            Top Recommendations ({recommendations.length} found)
          </h3>
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.device.id}
                device={rec.device}
                score={rec.score}
                reasons={rec.reasons}
                warnings={rec.warnings}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Compatibility calculation algorithm
function calculateCompatibility(
  candidate: Device,
  lookingFor: string,
  currentTelescope?: Device,
  currentCamera?: Device
): {
  score: number;
  reasons: string[];
  warnings: string[];
} {
  let score = 50; // Base score
  const reasons: string[] = [];
  const warnings: string[] = [];

  // Camera recommendations based on current telescope
  if (lookingFor === "Camera" && currentTelescope) {
    // Backfocus compatibility
    if (currentTelescope.backfocusMm && candidate.backfocusMm) {
      if (candidate.backfocusMm <= currentTelescope.backfocusMm) {
        score += 25;
        reasons.push(
          `Backfocus compatible: Camera requires ${candidate.backfocusMm}mm, telescope provides ${currentTelescope.backfocusMm}mm`
        );
      } else {
        score -= 20;
        warnings.push(
          `Insufficient backfocus: Camera needs ${candidate.backfocusMm}mm, telescope only has ${currentTelescope.backfocusMm}mm`
        );
      }
    }

    // Image circle compatibility
    if (
      currentTelescope.imageCircleMm &&
      candidate.sensorWidthMm &&
      candidate.sensorHeightMm
    ) {
      const sensorDiagonal = Math.sqrt(
        candidate.sensorWidthMm ** 2 + candidate.sensorHeightMm ** 2
      );
      if (sensorDiagonal <= currentTelescope.imageCircleMm) {
        score += 20;
        reasons.push(
          `Sensor fully illuminated: ${sensorDiagonal.toFixed(1)}mm sensor fits within ${currentTelescope.imageCircleMm}mm image circle`
        );
      } else {
        score -= 15;
        warnings.push(
          `Vignetting likely: Sensor diagonal ${sensorDiagonal.toFixed(1)}mm exceeds ${currentTelescope.imageCircleMm}mm image circle`
        );
      }
    }

    // Pixel sampling (optimal 1-3 arcsec/pixel)
    if (
      currentTelescope.focalLengthMm &&
      candidate.pixelSizeUm
    ) {
      const arcsecPerPixel =
        (206.265 * candidate.pixelSizeUm) / currentTelescope.focalLengthMm;
      if (arcsecPerPixel >= 1 && arcsecPerPixel <= 3) {
        score += 15;
        reasons.push(
          `Optimal pixel sampling: ${arcsecPerPixel.toFixed(2)} arcsec/pixel (ideal: 1-3)`
        );
      } else if (arcsecPerPixel < 1) {
        score -= 5;
        warnings.push(
          `Oversampled: ${arcsecPerPixel.toFixed(2)} arcsec/pixel (may need binning)`
        );
      } else {
        score -= 10;
        warnings.push(
          `Undersampled: ${arcsecPerPixel.toFixed(2)} arcsec/pixel (resolution limited)`
        );
      }
    }
  }

  // Telescope recommendations based on current camera
  if (lookingFor === "Telescope" && currentCamera) {
    // Image circle for camera sensor
    if (
      candidate.imageCircleMm &&
      currentCamera.sensorWidthMm &&
      currentCamera.sensorHeightMm
    ) {
      const sensorDiagonal = Math.sqrt(
        currentCamera.sensorWidthMm ** 2 + currentCamera.sensorHeightMm ** 2
      );
      if (sensorDiagonal <= candidate.imageCircleMm) {
        score += 20;
        reasons.push(
          `Sensor fully illuminated: ${sensorDiagonal.toFixed(1)}mm sensor fits within ${candidate.imageCircleMm}mm image circle`
        );
      } else {
        score -= 15;
        warnings.push(
          `Vignetting likely: Sensor diagonal ${sensorDiagonal.toFixed(1)}mm exceeds ${candidate.imageCircleMm}mm image circle`
        );
      }
    }

    // Backfocus for camera
    if (candidate.backfocusMm && currentCamera.backfocusMm) {
      if (currentCamera.backfocusMm <= candidate.backfocusMm) {
        score += 25;
        reasons.push(
          `Backfocus compatible: Camera requires ${currentCamera.backfocusMm}mm, telescope provides ${candidate.backfocusMm}mm`
        );
      } else {
        score -= 20;
        warnings.push(
          `Insufficient backfocus: Camera needs ${currentCamera.backfocusMm}mm, telescope only has ${candidate.backfocusMm}mm`
        );
      }
    }
  }

  // General quality indicators
  if (candidate.manufacturer && ["Celestron", "Takahashi", "ZWO", "QHYCCD"].includes(candidate.manufacturer)) {
    score += 5;
    reasons.push("Reputable manufacturer");
  }

  return { score: Math.max(0, Math.min(100, score)), reasons, warnings };
}
