import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { ObjectSelector } from "@/sky-visualizers/ObjectSelector";
import { LocationInput } from "@/sky-visualizers/LocationInput";
import { TimeControls } from "@/sky-visualizers/TimeControls";
import { OrbitalTrajectoryView } from "@/sky-visualizers/OrbitalTrajectoryView";
import { SkyPathView } from "@/sky-visualizers/SkyPathView";

export default function SkyVisualizersPage() {
  const [, navigate] = useLocation();
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"trajectory" | "sky-path">(
    "trajectory"
  );
  const [location, setLocation] = useState({ lat: 40.7128, lon: -74.006 }); // Default: NYC
  const [timeRange, setTimeRange] = useState({
    start: new Date(),
    end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Sky Visualizers</h1>
              <p className="text-sm text-muted-foreground">
                Explore orbital trajectories and sky paths of solar system
                objects
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar: Controls */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">Controls</h2>
              <div className="space-y-4">
                <ObjectSelector
                  selectedId={selectedObjectId}
                  onSelect={setSelectedObjectId}
                />
                <LocationInput
                  lat={location.lat}
                  lon={location.lon}
                  onChange={setLocation}
                />
                <TimeControls
                  startDate={timeRange.start}
                  endDate={timeRange.end}
                  onStartDateChange={(date) =>
                    setTimeRange({ ...timeRange, start: date })
                  }
                  onEndDateChange={(date) =>
                    setTimeRange({ ...timeRange, end: date })
                  }
                />
              </div>
            </Card>
          </div>

          {/* Main Visualization Area */}
          <div className="lg:col-span-9">
            <Card className="p-0 overflow-hidden" style={{ minHeight: "600px" }}>
              <Tabs
                value={viewMode}
                onValueChange={(v) => setViewMode(v as "trajectory" | "sky-path")}
                className="w-full"
              >
                <div className="border-b border-border px-4 pt-4">
                  <TabsList>
                    <TabsTrigger value="trajectory">
                      Orbital Trajectory
                    </TabsTrigger>
                    <TabsTrigger value="sky-path">Sky Path</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="trajectory" className="m-0">
                  {selectedObjectId ? (
                    <OrbitalTrajectoryView
                      objectId={selectedObjectId}
                      startDate={timeRange.start}
                      endDate={timeRange.end}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[600px] gap-4 p-8">
                      <AlertCircle className="w-12 h-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Select an object to view its orbital trajectory
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="sky-path" className="m-0">
                  {selectedObjectId ? (
                    <SkyPathView
                      objectId={selectedObjectId}
                      observerLat={location.lat}
                      observerLon={location.lon}
                      startDate={timeRange.start}
                      endDate={timeRange.end}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[600px] gap-4 p-8">
                      <AlertCircle className="w-12 h-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Select an object to view its sky path
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
