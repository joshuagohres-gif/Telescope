import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Camera, Gauge, Grid3x3, Droplets } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Recipe {
  id: number;
  trainId: string | null;
  targetClass: string;
  skyMpsasBin: string;
  filter: string;
  subExposureS: number;
  subs: number;
  ditherPix: number | null;
  bin: number | null;
  gain: string | null;
  iso: string | null;
  rationaleMd: string;
}

export function ExposureRecipePlanner() {
  const [targetClass, setTargetClass] = useState<string>("dso");
  const [skyBrightness, setSkyBrightness] = useState<string>("20.5");
  const [filter, setFilter] = useState<string>("L");
  const [trainId, setTrainId] = useState<string>("");
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data: recipe, isLoading, error, refetch } = useQuery<Recipe>({
    queryKey: ["/api/plan/recipe", targetClass, skyBrightness, filter, trainId],
    queryFn: async () => {
      const params = new URLSearchParams({
        target_class: targetClass,
        sky: skyBrightness,
        filter: filter,
      });
      if (trainId) params.append("train_id", trainId);

      const res = await fetch(`/astrodb/v1/plan/recipe?${params}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Plan & QA Pack not enabled. Set ASTRO_PLANQA_ENABLED=true");
        }
        throw new Error("Failed to fetch recipe");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: shouldFetch,
  });

  const handleGetRecipe = () => {
    setShouldFetch(true);
    refetch();
  };

  const totalExposureTime = recipe
    ? (recipe.subExposureS * recipe.subs) / 60
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Exposure Recipe Planner
        </CardTitle>
        <CardDescription>
          Get rule-based exposure recommendations for your imaging conditions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="targetClass">Target Type</Label>
            <Select value={targetClass} onValueChange={setTargetClass}>
              <SelectTrigger id="targetClass">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dso">Deep Sky Object (DSO)</SelectItem>
                <SelectItem value="planetary">Planetary</SelectItem>
                <SelectItem value="widefield">Wide Field</SelectItem>
                <SelectItem value="narrowband">Narrowband</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sky">Sky Brightness (mpsas)</Label>
            <Input
              id="sky"
              type="number"
              step="0.1"
              value={skyBrightness}
              onChange={(e) => setSkyBrightness(e.target.value)}
              placeholder="20.5"
            />
            <p className="text-xs text-muted-foreground">
              18-19: Urban, 19-20: Suburban, 20-21: Rural, 21-22: Dark, 22+: Very Dark
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter">Filter</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger id="filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="L">Luminance (L)</SelectItem>
                <SelectItem value="R">Red (R)</SelectItem>
                <SelectItem value="G">Green (G)</SelectItem>
                <SelectItem value="B">Blue (B)</SelectItem>
                <SelectItem value="Ha">H-alpha (Ha)</SelectItem>
                <SelectItem value="Oiii">OIII</SelectItem>
                <SelectItem value="Sii">SII</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trainId">Optical Train ID (Optional)</Label>
            <Input
              id="trainId"
              value={trainId}
              onChange={(e) => setTrainId(e.target.value)}
              placeholder="Leave blank for general recipe"
            />
          </div>
        </div>

        <Button onClick={handleGetRecipe} className="w-full" disabled={isLoading}>
          {isLoading ? "Loading..." : "Get Exposure Recipe"}
        </Button>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive">{error.message}</p>
          </div>
        )}

        {/* Recipe Display */}
        {recipe && (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="p-6 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {recipe.subExposureS}s
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Sub Exposure</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {recipe.subs}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Number of Subs</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {totalExposureTime.toFixed(0)}m
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Total Time</div>
                </div>
                <div className="text-center">
                  <Badge className="text-lg px-4 py-2">
                    {recipe.skyMpsasBin} mpsas
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">Sky Brightness Bin</div>
                </div>
              </div>
            </div>

            {/* Settings Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recipe.ditherPix !== null && (
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <Droplets className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Dithering</div>
                    <div className="text-sm text-muted-foreground">{recipe.ditherPix} pixels</div>
                  </div>
                </div>
              )}

              {recipe.bin !== null && (
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <Grid3x3 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Binning</div>
                    <div className="text-sm text-muted-foreground">{recipe.bin}x{recipe.bin}</div>
                  </div>
                </div>
              )}

              {recipe.gain !== null && (
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <Gauge className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Gain</div>
                    <div className="text-sm text-muted-foreground">{recipe.gain}</div>
                  </div>
                </div>
              )}

              {recipe.iso !== null && (
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <Camera className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">ISO</div>
                    <div className="text-sm text-muted-foreground">{recipe.iso}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Rationale */}
            <div className="p-4 border rounded-lg bg-card">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Rationale
              </h3>
              <div className="text-sm text-muted-foreground prose prose-sm max-w-none">
                <ReactMarkdown>{recipe.rationaleMd}</ReactMarkdown>
              </div>
            </div>

            {/* Recipe Meta */}
            <div className="text-xs text-muted-foreground border-t pt-4 grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium">Recipe ID:</span> {recipe.id}
              </div>
              <div>
                <span className="font-medium">Target Class:</span> {recipe.targetClass}
              </div>
              <div>
                <span className="font-medium">Filter:</span> {recipe.filter}
              </div>
              {recipe.trainId && (
                <div>
                  <span className="font-medium">Train ID:</span> {recipe.trainId}
                </div>
              )}
            </div>
          </div>
        )}

        {!recipe && !error && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Enter your imaging conditions above to get a recommended exposure recipe</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
