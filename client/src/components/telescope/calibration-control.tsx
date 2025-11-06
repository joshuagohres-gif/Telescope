import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Compass, Check, AlertCircle } from "lucide-react";

export function CalibrationControl() {
  const [azCorrection, setAzCorrection] = useState("");
  const [altCorrection, setAltCorrection] = useState("");
  const [isCalibrating, setIsCalibrating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ["/api/telescope/status"],
    refetchInterval: 1000,
  });

  const calibration = status?.calibration;

  const startCalibrationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/calibration/start-polar-alignment", {});
    },
    onSuccess: () => {
      setIsCalibrating(true);
      toast({ title: "Polar alignment started", description: "Follow the instructions to align your mount." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Calibration failed", description: error.message });
    },
  });

  const completeCalibrationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/calibration/complete-polar-alignment", {
        azCorrection: parseFloat(azCorrection),
        altCorrection: parseFloat(altCorrection),
      });
    },
    onSuccess: () => {
      setIsCalibrating(false);
      setAzCorrection("");
      setAltCorrection("");
      toast({ title: "Calibration complete", description: "Polar alignment has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/telescope/status"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Calibration failed", description: error.message });
    },
  });

  const plateSolveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/calibration/plate-solve", {});
    },
    onSuccess: () => {
      toast({ title: "Plate solving complete" });
      queryClient.invalidateQueries({ queryKey: ["/api/telescope/status"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Plate solve failed", description: error.message });
    },
  });

  const formatError = (error: number | undefined) => {
    if (!error) return "N/A";
    return `${error.toFixed(2)} arcmin`;
  };

  const getErrorStatus = (error: number | undefined) => {
    if (!error) return { color: "text-muted-foreground", message: "Unknown" };
    if (error < 5) return { color: "text-telescope-connected", message: "Excellent" };
    if (error < 10) return { color: "text-telescope-slewing", message: "Good" };
    return { color: "text-telescope-error", message: "Needs Adjustment" };
  };

  const errorStatus = getErrorStatus(calibration?.polarAlignmentError);

  return (
    <div className="space-y-6">
      {/* Current Alignment Status */}
      <div className="p-4 rounded-md bg-muted/50 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Polar Alignment Status</h3>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Alignment Error:</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-mono font-semibold ${errorStatus.color}`} data-testid="text-alignment-error">
                {formatError(calibration?.polarAlignmentError)}
              </span>
              <span className={`text-xs ${errorStatus.color}`}>({errorStatus.message})</span>
            </div>
          </div>

          {calibration?.polarAlignmentAz !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Azimuth Correction:</span>
              <span className="text-sm font-mono" data-testid="text-az-correction">
                {calibration.polarAlignmentAz.toFixed(2)}°
              </span>
            </div>
          )}

          {calibration?.polarAlignmentAlt !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Altitude Correction:</span>
              <span className="text-sm font-mono" data-testid="text-alt-correction">
                {calibration.polarAlignmentAlt.toFixed(2)}°
              </span>
            </div>
          )}

          {calibration?.lastCalibration && (
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Last Calibration:</span>
              <span className="text-sm" data-testid="text-last-calibration">
                {new Date(calibration.lastCalibration).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Polar Alignment Wizard */}
      {!isCalibrating ? (
        <div className="space-y-4">
          <Button
            onClick={() => startCalibrationMutation.mutate()}
            disabled={startCalibrationMutation.isPending}
            className="w-full gap-2"
            data-testid="button-start-calibration"
          >
            <Compass className="w-4 h-4" />
            Start Polar Alignment
          </Button>

          <Button
            variant="secondary"
            onClick={() => plateSolveMutation.mutate()}
            disabled={plateSolveMutation.isPending}
            className="w-full gap-2"
            data-testid="button-plate-solve"
          >
            Plate Solve Position
          </Button>
        </div>
      ) : (
        <Card className="p-4 space-y-4 border-primary/50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">Polar Alignment Instructions</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Point telescope at celestial pole</li>
                <li>Adjust mount's azimuth and altitude</li>
                <li>Enter corrections below</li>
                <li>Complete alignment</li>
              </ol>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label>Azimuth Correction (degrees)</Label>
              <Input
                type="number"
                value={azCorrection}
                onChange={(e) => setAzCorrection(e.target.value)}
                placeholder="0.0"
                step="0.1"
                className="font-mono"
                data-testid="input-az-correction"
              />
            </div>

            <div className="space-y-2">
              <Label>Altitude Correction (degrees)</Label>
              <Input
                type="number"
                value={altCorrection}
                onChange={(e) => setAltCorrection(e.target.value)}
                placeholder="0.0"
                step="0.1"
                className="font-mono"
                data-testid="input-alt-correction"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => completeCalibrationMutation.mutate()}
                disabled={!azCorrection || !altCorrection || completeCalibrationMutation.isPending}
                className="flex-1 gap-2"
                data-testid="button-complete-calibration"
              >
                <Check className="w-4 h-4" />
                Complete
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsCalibrating(false)}
                className="flex-1"
                data-testid="button-cancel-calibration"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
