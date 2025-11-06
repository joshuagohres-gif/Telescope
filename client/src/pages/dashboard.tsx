import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { CommandInput } from "@/components/telescope/command-input";
import { TelescopeViewport } from "@/components/telescope/telescope-viewport";
import { PositionControl } from "@/components/telescope/position-control";
import { TrackingControl } from "@/components/telescope/tracking-control";
import { CameraControl } from "@/components/telescope/camera-control";
import { FocusControl } from "@/components/telescope/focus-control";
import { CalibrationControl } from "@/components/telescope/calibration-control";
import { StatusDashboard } from "@/components/telescope/status-dashboard";
import { CommandHistory } from "@/components/telescope/command-history";
import { ConnectionToggle } from "@/components/telescope/connection-toggle";
import { EmergencyControls } from "@/components/telescope/emergency-controls";
import { Telescope, Target, Camera, Focus, Settings } from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("position");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Telescope className="w-6 h-6 text-primary" data-testid="icon-telescope-logo" />
            <h1 className="text-xl font-semibold" data-testid="text-app-title">Telescope Control System</h1>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionToggle />
            <EmergencyControls />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Command Input & History */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <CommandInput />
            <CommandHistory />
          </div>

          {/* Center Column: Viewport & Controls */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <TelescopeViewport />
            
            <Card className="p-6" data-testid="card-control-panels">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="position" className="gap-2" data-testid="tab-position">
                    <Telescope className="w-4 h-4" />
                    <span className="hidden sm:inline">Position</span>
                  </TabsTrigger>
                  <TabsTrigger value="track" className="gap-2" data-testid="tab-track">
                    <Target className="w-4 h-4" />
                    <span className="hidden sm:inline">Track</span>
                  </TabsTrigger>
                  <TabsTrigger value="camera" className="gap-2" data-testid="tab-camera">
                    <Camera className="w-4 h-4" />
                    <span className="hidden sm:inline">Camera</span>
                  </TabsTrigger>
                  <TabsTrigger value="focus" className="gap-2" data-testid="tab-focus">
                    <Focus className="w-4 h-4" />
                    <span className="hidden sm:inline">Focus</span>
                  </TabsTrigger>
                  <TabsTrigger value="calibrate" className="gap-2" data-testid="tab-calibrate">
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Calibrate</span>
                  </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                  <TabsContent value="position" className="mt-0">
                    <PositionControl />
                  </TabsContent>
                  <TabsContent value="track" className="mt-0">
                    <TrackingControl />
                  </TabsContent>
                  <TabsContent value="camera" className="mt-0">
                    <CameraControl />
                  </TabsContent>
                  <TabsContent value="focus" className="mt-0">
                    <FocusControl />
                  </TabsContent>
                  <TabsContent value="calibrate" className="mt-0">
                    <CalibrationControl />
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </div>

          {/* Right Column: Status Dashboard */}
          <div className="lg:col-span-3">
            <StatusDashboard />
          </div>
        </div>
      </div>
    </div>
  );
}
