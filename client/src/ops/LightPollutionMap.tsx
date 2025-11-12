import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, Star } from "lucide-react";

interface Site {
  id: string;
  name: string;
}

interface LightPollutionData {
  id: number;
  siteId: string;
  estimatedMpsas: number;
  method: string;
  source: string;
  measuredAt: string | null;
  createdAt: string;
}

function getBortleClass(mpsas: number): { class: number; name: string; color: string; description: string; icon: React.ReactNode } {
  if (mpsas >= 21.99) {
    return {
      class: 1,
      name: "Excellent Dark Sky",
      color: "bg-black text-white",
      description: "Zodiacal light visible, M33 direct vision",
      icon: <Star className="w-4 h-4" />
    };
  } else if (mpsas >= 21.89) {
    return {
      class: 2,
      name: "Typical Dark Sky",
      color: "bg-gray-900 text-white",
      description: "Milky Way structure visible, zodiacal light evident",
      icon: <Star className="w-4 h-4" />
    };
  } else if (mpsas >= 21.69) {
    return {
      class: 3,
      name: "Rural Sky",
      color: "bg-gray-800 text-white",
      description: "Milky Way visible, light pollution dome on horizon",
      icon: <Moon className="w-4 h-4" />
    };
  } else if (mpsas >= 20.49) {
    return {
      class: 4,
      name: "Rural/Suburban Transition",
      color: "bg-gray-700 text-white",
      description: "Milky Way visible but weak, light domes in several directions",
      icon: <Moon className="w-4 h-4" />
    };
  } else if (mpsas >= 19.50) {
    return {
      class: 5,
      name: "Suburban Sky",
      color: "bg-orange-600 text-white",
      description: "Milky Way very faint or invisible, sky glow visible",
      icon: <Sun className="w-4 h-4" />
    };
  } else if (mpsas >= 18.94) {
    return {
      class: 6,
      name: "Bright Suburban",
      color: "bg-orange-500 text-white",
      description: "Sky grayish, Milky Way invisible",
      icon: <Sun className="w-4 h-4" />
    };
  } else if (mpsas >= 18.38) {
    return {
      class: 7,
      name: "Suburban/Urban Transition",
      color: "bg-yellow-500 text-black",
      description: "Strong light pollution, sky strongly lit",
      icon: <Sun className="w-4 h-4" />
    };
  } else if (mpsas >= 17.0) {
    return {
      class: 8,
      name: "City Sky",
      color: "bg-yellow-400 text-black",
      description: "Sky glows white or orange, only brightest objects visible",
      icon: <Sun className="w-4 h-4" />
    };
  } else {
    return {
      class: 9,
      name: "Inner City Sky",
      color: "bg-red-500 text-white",
      description: "Entire sky brightly lit, only Moon, planets, and very brightest stars visible",
      icon: <Sun className="w-4 h-4" />
    };
  }
}

export function LightPollutionMap() {
  const [selectedSite, setSelectedSite] = useState<string>("");

  // Fetch sites
  const { data: sites } = useQuery<Site[]>({
    queryKey: ["/api/ops/sites"],
    queryFn: async () => {
      const res = await fetch("/api/ops/sites");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch light pollution data for selected site
  const { data: pollutionData, isLoading } = useQuery<LightPollutionData>({
    queryKey: ["/api/ops/light-pollution", selectedSite],
    queryFn: async () => {
      if (!selectedSite) return null;
      const res = await fetch(`/api/ops/sites/${selectedSite}/light-pollution`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    },
    enabled: !!selectedSite,
  });

  // Auto-select first site
  useEffect(() => {
    if (sites && sites.length > 0 && !selectedSite) {
      setSelectedSite(sites[0].id);
    }
  }, [sites, selectedSite]);

  const bortleInfo = pollutionData ? getBortleClass(pollutionData.estimatedMpsas) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="w-5 h-5" />
          Light Pollution Assessment
        </CardTitle>
        <CardDescription>
          Sky brightness estimates and Bortle scale classification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Site Selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Observatory Site:</label>
          <Select value={selectedSite} onValueChange={setSelectedSite}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a site" />
            </SelectTrigger>
            <SelectContent>
              {sites?.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">Loading light pollution data...</div>
        )}

        {/* Sky Brightness Card */}
        {pollutionData && bortleInfo && (
          <div className="p-6 border rounded-lg bg-muted/50 space-y-6">
            {/* Primary Sky Brightness */}
            <div className="text-center space-y-2">
              <div className="text-6xl font-bold text-primary">
                {pollutionData.estimatedMpsas.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                mag/arcsec² (magnitudes per square arcsecond)
              </div>
            </div>

            {/* Bortle Classification */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Badge className={`${bortleInfo.color} px-4 py-2 text-base`}>
                  {bortleInfo.icon}
                  <span className="ml-2">Bortle Class {bortleInfo.class}</span>
                </Badge>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg">{bortleInfo.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{bortleInfo.description}</p>
              </div>
            </div>

            {/* Bortle Scale Reference */}
            <div className="pt-4 border-t space-y-2">
              <h4 className="font-semibold text-sm">Bortle Scale Reference</h4>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-black text-white">
                  <span>Class 1-2 (22.0+ mpsas)</span>
                  <span>Excellent/Typical Dark Sky</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-gray-700 text-white">
                  <span>Class 3-4 (20.5-22.0 mpsas)</span>
                  <span>Rural Sky</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-orange-600 text-white">
                  <span>Class 5-6 (19.0-20.5 mpsas)</span>
                  <span>Suburban Sky</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-yellow-500 text-black">
                  <span>Class 7-8 (17.0-19.0 mpsas)</span>
                  <span>Urban Sky</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-red-500 text-white">
                  <span>Class 9 (&lt;17.0 mpsas)</span>
                  <span>Inner City</span>
                </div>
              </div>
            </div>

            {/* Estimation Details */}
            <div className="pt-4 border-t space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimation Method:</span>
                <span className="font-medium">{pollutionData.method}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Data Source:</span>
                <span className="font-medium">{pollutionData.source}</span>
              </div>
              {pollutionData.measuredAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Measured:</span>
                  <span className="font-medium">
                    {new Date(pollutionData.measuredAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Imaging Guidance */}
            <div className="pt-4 border-t space-y-2">
              <h4 className="font-semibold text-sm">Imaging Guidance</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                {bortleInfo.class <= 3 && (
                  <p>✓ Excellent for wide-field nebula and galaxy imaging</p>
                )}
                {bortleInfo.class <= 4 && (
                  <p>✓ Good for narrowband and planetary imaging</p>
                )}
                {bortleInfo.class >= 5 && bortleInfo.class <= 6 && (
                  <>
                    <p>⚠ Narrowband filters recommended for nebulae</p>
                    <p>✓ Good for planetary and lunar imaging</p>
                  </>
                )}
                {bortleInfo.class >= 7 && (
                  <>
                    <p>⚠ Narrowband-only for deep sky imaging</p>
                    <p>✓ Planetary, lunar, and bright targets viable</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedSite && !pollutionData && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <Sun className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No light pollution data available for this site.</p>
            <p className="text-sm">Upload measurements or use estimation service.</p>
          </div>
        )}

        {!selectedSite && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Select a site to view light pollution data</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
