import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Focus, Minus, Plus, ChevronsLeft, ChevronsRight, Thermometer } from "lucide-react";

export function FocusControl() {
  const [targetPosition, setTargetPosition] = useState("");
  const [relativeSteps, setRelativeSteps] = useState("100");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ["/api/telescope/status"],
    refetchInterval: 500,
  });

  const focuser = status?.focuser;

  const moveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/focuser/move", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telescope/status"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Focus move failed", description: error.message });
    },
  });

  const handleMoveAbsolute = () => {
    const position = parseInt(targetPosition);
    if (isNaN(position) || position < 0 || (focuser && position > focuser.maxPosition)) {
      toast({ variant: "destructive", title: "Invalid position" });
      return;
    }
    moveMutation.mutate({ action: "move_absolute", position });
    toast({ title: "Moving focuser..." });
  };

  const handleMoveRelative = (steps: number) => {
    moveMutation.mutate({ action: "move_relative", steps });
    toast({ title: `Moving ${steps > 0 ? 'outward' : 'inward'}...` });
  };

  const progressPercentage = focuser 
    ? (focuser.position / focuser.maxPosition) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Focuser Status */}
      {focuser?.connected && (
        <div className="space-y-3">
          <div className="p-4 rounded-md bg-muted/50 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Focus className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Current Position</span>
              </div>
              <span className="text-lg font-mono font-semibold" data-testid="text-focus-position">
                {focuser.position} / {focuser.maxPosition}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" data-testid="progress-focus" />
            {focuser.temperature !== undefined && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Temperature</span>
                </div>
                <span className="text-sm font-mono font-medium" data-testid="text-focus-temp">
                  {focuser.temperature.toFixed(1)}°C
                </span>
              </div>
            )}
          </div>

          {focuser.moving && (
            <div className="p-3 rounded-md bg-primary/10 border border-primary">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-sm font-medium">Focuser moving...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fine/Coarse Control */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Relative Movement</h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="flex-shrink-0">Step Size:</Label>
            <Input
              type="number"
              value={relativeSteps}
              onChange={(e) => setRelativeSteps(e.target.value)}
              min="1"
              max="10000"
              className="font-mono"
              data-testid="input-step-size"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => handleMoveRelative(-parseInt(relativeSteps) * 10)}
              disabled={focuser?.moving || !focuser?.connected}
              className="gap-2"
              data-testid="button-focus-coarse-in"
            >
              <ChevronsLeft className="w-4 h-4" />
              Coarse In
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleMoveRelative(parseInt(relativeSteps) * 10)}
              disabled={focuser?.moving || !focuser?.connected}
              className="gap-2"
              data-testid="button-focus-coarse-out"
            >
              Coarse Out
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => handleMoveRelative(-parseInt(relativeSteps))}
              disabled={focuser?.moving || !focuser?.connected}
              className="gap-2"
              data-testid="button-focus-fine-in"
            >
              <Minus className="w-4 h-4" />
              Fine In
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleMoveRelative(parseInt(relativeSteps))}
              disabled={focuser?.moving || !focuser?.connected}
              className="gap-2"
              data-testid="button-focus-fine-out"
            >
              Fine Out
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Absolute Position */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Absolute Position</h3>
        <div className="space-y-2">
          <Label>Target Position</Label>
          <Input
            type="number"
            value={targetPosition}
            onChange={(e) => setTargetPosition(e.target.value)}
            min="0"
            max={focuser?.maxPosition ?? 10000}
            className="font-mono"
            data-testid="input-target-position"
            placeholder={`0 - ${focuser?.maxPosition ?? 10000}`}
          />
        </div>
        <Button
          onClick={handleMoveAbsolute}
          disabled={focuser?.moving || !focuser?.connected || !targetPosition}
          className="w-full"
          data-testid="button-move-absolute"
        >
          Move to Position
        </Button>
      </div>
    </div>
  );
}
