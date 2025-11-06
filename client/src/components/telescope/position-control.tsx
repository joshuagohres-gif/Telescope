import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home, Navigation2 } from "lucide-react";

export function PositionControl() {
  const [raHours, setRaHours] = useState("");
  const [raMinutes, setRaMinutes] = useState("");
  const [raSeconds, setRaSeconds] = useState("");
  const [decDegrees, setDecDegrees] = useState("");
  const [decMinutes, setDecMinutes] = useState("");
  const [decSeconds, setDecSeconds] = useState("");
  const [alt, setAlt] = useState("");
  const [az, setAz] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const gotoMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/telescope/goto", data);
    },
    onSuccess: () => {
      toast({ title: "Slewing to target" });
      queryClient.invalidateQueries({ queryKey: ["/api/telescope/status"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Slew failed", description: error.message });
    },
  });

  const handleGotoEquatorial = () => {
    const ra = parseFloat(raHours) + parseFloat(raMinutes) / 60 + parseFloat(raSeconds) / 3600;
    const dec = parseFloat(decDegrees) + parseFloat(decMinutes) / 60 + parseFloat(decSeconds) / 3600;
    
    if (isNaN(ra) || isNaN(dec)) {
      toast({ variant: "destructive", title: "Invalid coordinates" });
      return;
    }
    
    gotoMutation.mutate({ ra, dec });
  };

  const handleGotoHorizontal = () => {
    const altitude = parseFloat(alt);
    const azimuth = parseFloat(az);
    
    if (isNaN(altitude) || isNaN(azimuth)) {
      toast({ variant: "destructive", title: "Invalid coordinates" });
      return;
    }
    
    gotoMutation.mutate({ alt: altitude, az: azimuth });
  };

  const handleSlew = (direction: string) => {
    apiRequest("POST", "/api/telescope/slew", { direction }).then(() => {
      toast({ title: `Slewing ${direction}` });
    });
  };

  const handleHome = () => {
    apiRequest("POST", "/api/telescope/home", {}).then(() => {
      toast({ title: "Going to home position" });
      queryClient.invalidateQueries({ queryKey: ["/api/telescope/status"] });
    });
  };

  return (
    <div className="space-y-6">
      {/* Manual Slew Controls */}
      <div>
        <h3 className="text-sm font-medium mb-4">Manual Slew</h3>
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => handleSlew("north")}
            data-testid="button-slew-north"
            className="hover-elevate active-elevate-2"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => handleSlew("west")}
              data-testid="button-slew-west"
              className="hover-elevate active-elevate-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleHome}
              data-testid="button-home"
              className="hover-elevate active-elevate-2"
            >
              <Home className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => handleSlew("east")}
              data-testid="button-slew-east"
              className="hover-elevate active-elevate-2"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => handleSlew("south")}
            data-testid="button-slew-south"
            className="hover-elevate active-elevate-2"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* GoTo Controls */}
      <div>
        <h3 className="text-sm font-medium mb-4">GoTo Coordinates</h3>
        <Tabs defaultValue="equatorial">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="equatorial">Equatorial</TabsTrigger>
            <TabsTrigger value="horizontal">Horizontal</TabsTrigger>
          </TabsList>

          <TabsContent value="equatorial" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Right Ascension</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Input
                    type="number"
                    placeholder="HH"
                    value={raHours}
                    onChange={(e) => setRaHours(e.target.value)}
                    min="0"
                    max="23"
                    data-testid="input-ra-hours"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Hours</p>
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="MM"
                    value={raMinutes}
                    onChange={(e) => setRaMinutes(e.target.value)}
                    min="0"
                    max="59"
                    data-testid="input-ra-minutes"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Min</p>
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="SS"
                    value={raSeconds}
                    onChange={(e) => setRaSeconds(e.target.value)}
                    min="0"
                    max="59"
                    data-testid="input-ra-seconds"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Sec</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Declination</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Input
                    type="number"
                    placeholder="±DD"
                    value={decDegrees}
                    onChange={(e) => setDecDegrees(e.target.value)}
                    min="-90"
                    max="90"
                    data-testid="input-dec-degrees"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Degrees</p>
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="MM"
                    value={decMinutes}
                    onChange={(e) => setDecMinutes(e.target.value)}
                    min="0"
                    max="59"
                    data-testid="input-dec-minutes"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Min</p>
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="SS"
                    value={decSeconds}
                    onChange={(e) => setDecSeconds(e.target.value)}
                    min="0"
                    max="59"
                    data-testid="input-dec-seconds"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Sec</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleGotoEquatorial}
              disabled={gotoMutation.isPending}
              className="w-full gap-2"
              data-testid="button-goto-equatorial"
            >
              <Navigation2 className="w-4 h-4" />
              GoTo Equatorial
            </Button>
          </TabsContent>

          <TabsContent value="horizontal" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Altitude (°)</Label>
              <Input
                type="number"
                placeholder="0-90"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                min="0"
                max="90"
                step="0.1"
                data-testid="input-altitude"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>Azimuth (°)</Label>
              <Input
                type="number"
                placeholder="0-360"
                value={az}
                onChange={(e) => setAz(e.target.value)}
                min="0"
                max="360"
                step="0.1"
                data-testid="input-azimuth"
                className="font-mono"
              />
            </div>

            <Button
              onClick={handleGotoHorizontal}
              disabled={gotoMutation.isPending}
              className="w-full gap-2"
              data-testid="button-goto-horizontal"
            >
              <Navigation2 className="w-4 h-4" />
              GoTo Horizontal
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
