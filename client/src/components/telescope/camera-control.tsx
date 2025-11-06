import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Camera, Square, Thermometer } from "lucide-react";

export function CameraControl() {
  const [exposureTime, setExposureTime] = useState("30");
  const [gain, setGain] = useState([50]);
  const [binning, setBinning] = useState("1");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ["/api/telescope/status"],
    refetchInterval: 500,
  });

  const camera = status?.camera;

  const captureMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/camera/capture", {
        exposureTime: parseFloat(exposureTime),
        gain: gain[0],
        binning: parseInt(binning),
      });
    },
    onSuccess: () => {
      toast({ title: "Exposure started" });
      queryClient.invalidateQueries({ queryKey: ["/api/telescope/status"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Capture failed", description: error.message });
    },
  });

  const abortMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/camera/abort", {});
    },
    onSuccess: () => {
      toast({ title: "Exposure aborted" });
      queryClient.invalidateQueries({ queryKey: ["/api/telescope/status"] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Camera Status */}
      {camera?.connected && camera?.temperature !== undefined && (
        <div className="p-4 rounded-md bg-muted/50 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sensor Temperature</span>
            </div>
            <span className="text-sm font-mono font-medium" data-testid="text-camera-temp">
              {camera.temperature.toFixed(1)}°C
            </span>
          </div>
        </div>
      )}

      {/* Exposure Settings */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Exposure Time (seconds)</Label>
          <Input
            type="number"
            value={exposureTime}
            onChange={(e) => setExposureTime(e.target.value)}
            min="0.001"
            max="3600"
            step="0.1"
            disabled={camera?.exposing}
            data-testid="input-exposure-time"
            className="font-mono"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Gain</Label>
            <span className="text-sm font-mono" data-testid="text-gain-value">{gain[0]}</span>
          </div>
          <Slider
            value={gain}
            onValueChange={setGain}
            min={0}
            max={100}
            step={1}
            disabled={camera?.exposing}
            data-testid="slider-gain"
          />
        </div>

        <div className="space-y-2">
          <Label>Binning</Label>
          <Select value={binning} onValueChange={setBinning} disabled={camera?.exposing}>
            <SelectTrigger data-testid="select-binning">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1x1 (Full Resolution)</SelectItem>
              <SelectItem value="2">2x2</SelectItem>
              <SelectItem value="3">3x3</SelectItem>
              <SelectItem value="4">4x4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Exposure Progress */}
      {camera?.exposing && camera?.progress !== undefined && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Exposure Progress</span>
            <span className="text-sm font-mono" data-testid="text-exposure-progress">
              {camera.progress.toFixed(0)}%
            </span>
          </div>
          <Progress value={camera.progress} className="h-2" data-testid="progress-exposure" />
        </div>
      )}

      {/* Capture Controls */}
      <div className="flex gap-2">
        <Button
          onClick={() => captureMutation.mutate()}
          disabled={camera?.exposing || captureMutation.isPending || !camera?.connected}
          className="flex-1 gap-2"
          data-testid="button-capture"
        >
          <Camera className="w-4 h-4" />
          Capture Image
        </Button>
        <Button
          variant="destructive"
          onClick={() => abortMutation.mutate()}
          disabled={!camera?.exposing || abortMutation.isPending}
          className="flex-1 gap-2"
          data-testid="button-abort"
        >
          <Square className="w-4 h-4" />
          Abort
        </Button>
      </div>

      {camera?.exposing && (
        <div className="p-3 rounded-md bg-primary/10 border border-primary">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-medium">Exposing: {exposureTime}s at gain {gain[0]}</span>
          </div>
        </div>
      )}
    </div>
  );
}
