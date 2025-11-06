import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CelestialTarget } from "@shared/schema";
import { Target, PlayCircle, StopCircle, Search } from "lucide-react";

export function TrackingControl() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: targets, isLoading } = useQuery<CelestialTarget[]>({
    queryKey: ["/api/targets"],
  });

  const { data: status } = useQuery({
    queryKey: ["/api/telescope/status"],
    refetchInterval: 1000,
  });

  const trackMutation = useMutation({
    mutationFn: async (targetName: string) => {
      return await apiRequest("POST", "/api/telescope/track", { target: targetName });
    },
    onSuccess: () => {
      toast({ title: "Tracking started" });
      queryClient.invalidateQueries({ queryKey: ["/api/telescope/status"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Tracking failed", description: error.message });
    },
  });

  const stopTrackingMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/telescope/stop-tracking", {});
    },
    onSuccess: () => {
      toast({ title: "Tracking stopped" });
      queryClient.invalidateQueries({ queryKey: ["/api/telescope/status"] });
    },
  });

  const filteredTargets = targets?.filter(target =>
    target.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    target.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    target.constellation?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTrack = () => {
    if (selectedTarget) {
      trackMutation.mutate(selectedTarget);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Search Celestial Objects</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, type, or constellation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-targets"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Select Target</Label>
          <Select value={selectedTarget} onValueChange={setSelectedTarget}>
            <SelectTrigger data-testid="select-target">
              <SelectValue placeholder="Choose a celestial object" />
            </SelectTrigger>
            <SelectContent>
              {isLoading && (
                <div className="p-2 text-sm text-muted-foreground">Loading targets...</div>
              )}
              {filteredTargets?.map((target) => (
                <SelectItem key={target.id} value={target.name} data-testid={`option-target-${target.name}`}>
                  <div className="flex items-center gap-2">
                    <Target className="w-3 h-3" />
                    <span>{target.name}</span>
                    <span className="text-xs text-muted-foreground">({target.type})</span>
                  </div>
                </SelectItem>
              ))}
              {filteredTargets?.length === 0 && (
                <div className="p-2 text-sm text-muted-foreground">No targets found</div>
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedTarget && (
          <div className="p-4 rounded-md bg-muted/50 border border-border space-y-2">
            <h4 className="font-medium text-sm">Target Information</h4>
            {targets?.find(t => t.name === selectedTarget) && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium capitalize">
                    {targets.find(t => t.name === selectedTarget)?.type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RA:</span>
                  <span className="font-mono font-medium">
                    {targets.find(t => t.name === selectedTarget)?.ra.toFixed(4)}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dec:</span>
                  <span className="font-mono font-medium">
                    {targets.find(t => t.name === selectedTarget)?.dec.toFixed(4)}°
                  </span>
                </div>
                {targets.find(t => t.name === selectedTarget)?.magnitude && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Magnitude:</span>
                    <span className="font-mono font-medium">
                      {targets.find(t => t.name === selectedTarget)?.magnitude?.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleTrack}
          disabled={!selectedTarget || trackMutation.isPending}
          className="flex-1 gap-2"
          data-testid="button-start-tracking"
        >
          <PlayCircle className="w-4 h-4" />
          Start Tracking
        </Button>
        <Button
          variant="destructive"
          onClick={() => stopTrackingMutation.mutate()}
          disabled={!status?.telescope?.tracking || stopTrackingMutation.isPending}
          className="flex-1 gap-2"
          data-testid="button-stop-tracking"
        >
          <StopCircle className="w-4 h-4" />
          Stop
        </Button>
      </div>

      {status?.telescope?.tracking && (
        <div className="p-3 rounded-md bg-telescope-tracking/10 border border-telescope-tracking">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-telescope-tracking rounded-full animate-pulse" />
            <span className="text-sm font-medium">Actively tracking: {status.telescope.currentTarget}</span>
          </div>
        </div>
      )}
    </div>
  );
}
