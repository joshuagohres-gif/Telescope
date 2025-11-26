import { useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandInput } from "@/components/telescope/command-input";
import { TelescopeViewport } from "@/components/telescope/telescope-viewport";
import { PositionControl } from "@/components/telescope/position-control";
import { TrackingControl } from "@/components/telescope/tracking-control";
import { CameraControl } from "@/components/telescope/camera-control";
import { FocusControl } from "@/components/telescope/focus-control";
import { CalibrationControl } from "@/components/telescope/calibration-control";
import { SequenceManager } from "@/components/telescope/sequence-manager";
import { StatusDashboard } from "@/components/telescope/status-dashboard";
import { CommandHistory } from "@/components/telescope/command-history";
import { ConnectionToggle } from "@/components/telescope/connection-toggle";
import { EmergencyControls } from "@/components/telescope/emergency-controls";
import { DeviceDiscovery } from "@/components/telescope/device-discovery";
import { LocationControl } from "@/components/telescope/location-control";
import { UserMenu } from "@/components/auth/user-menu";
import { useStarField } from "@/hooks/use-star-field";
import { ConstellationBackground } from "@/components/ui/constellation-background";
import {
  Telescope,
  Target,
  Camera,
  Focus,
  Settings,
  Film,
  MapPin,
  Lightbulb,
  Wrench,
  ChevronDown,
  Menu,
  Globe,
  Database,
  Ruler,
  Orbit,
  Sparkles
} from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("position");
  const [location, navigate] = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Add space-themed background effects
  useStarField({ starCount: 100, speed: 0.3 });

  return (
    <div className="min-h-screen bg-background relative">
      {/* Constellation background layer */}
      <ConstellationBackground opacity={0.2} />
      {/* Header */}
      <header className="border-b border-border bg-card relative z-20">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 px-2 hover:bg-accent">
                <Telescope className="w-6 h-6 text-primary" data-testid="icon-telescope-logo" />
                <h1 className="text-xl font-semibold" data-testid="text-app-title">Telescope Control System</h1>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem
                onClick={() => {
                  navigate("/operations");
                  setIsDropdownOpen(false);
                }}
                className="cursor-pointer gap-2"
              >
                <MapPin className="w-4 h-4" />
                <span>Operations</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigate("/planqa");
                  setIsDropdownOpen(false);
                }}
                className="cursor-pointer gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                <span>Plan & QA</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigate("/calibration");
                  setIsDropdownOpen(false);
                }}
                className="cursor-pointer gap-2"
              >
                <Wrench className="w-4 h-4" />
                <span>Calibration</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigate("/skymap");
                  setIsDropdownOpen(false);
                }}
                className="cursor-pointer gap-2"
              >
                <Globe className="w-4 h-4" />
                <span>Community Sky Map</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigate("/astrodb");
                  setIsDropdownOpen(false);
                }}
                className="cursor-pointer gap-2"
              >
                <Database className="w-4 h-4" />
                <span>AstroDB - Equipment & Catalog</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigate("/design");
                  setIsDropdownOpen(false);
                }}
                className="cursor-pointer gap-2"
              >
                <Ruler className="w-4 h-4" />
                <span>Design Knowledge Base</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigate("/sky-visualizers");
                  setIsDropdownOpen(false);
                }}
                className="cursor-pointer gap-2"
              >
                <Orbit className="w-4 h-4" />
                <span>Sky Visualizers</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigate("/generative-design");
                  setIsDropdownOpen(false);
                }}
                className="cursor-pointer gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generative Design (AI)</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <DeviceDiscovery />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-3">
            <ConnectionToggle />
            <EmergencyControls />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto p-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Command Input & History */}
          <div className="lg:col-span-3 flex flex-col gap-4 relative z-10">
            <CommandInput />
            <CommandHistory />
          </div>

          {/* Center Column: Viewport & Controls */}
          <div className="lg:col-span-6 flex flex-col gap-4 relative z-10">
            <TelescopeViewport />

            <Card className="p-6 relative z-10 bg-card" data-testid="card-control-panels">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-7 w-full">
                  <TabsTrigger value="position" className="gap-2" data-testid="tab-position">
                    <Telescope className="w-4 h-4" />
                    <span className="hidden sm:inline">Position</span>
                  </TabsTrigger>
                  <TabsTrigger value="track" className="gap-2" data-testid="tab-track">
                    <Target className="w-4 h-4" />
                    <span className="hidden sm:inline">Track</span>
                  </TabsTrigger>
                  <TabsTrigger value="location" className="gap-2" data-testid="tab-location">
                    <MapPin className="w-4 h-4" />
                    <span className="hidden sm:inline">Location</span>
                  </TabsTrigger>
                  <TabsTrigger value="camera" className="gap-2" data-testid="tab-camera">
                    <Camera className="w-4 h-4" />
                    <span className="hidden sm:inline">Camera</span>
                  </TabsTrigger>
                  <TabsTrigger value="sequences" className="gap-2" data-testid="tab-sequences">
                    <Film className="w-4 h-4" />
                    <span className="hidden sm:inline">Sequences</span>
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
                  <TabsContent value="location" className="mt-0">
                    <LocationControl />
                  </TabsContent>
                  <TabsContent value="camera" className="mt-0">
                    <CameraControl />
                  </TabsContent>
                  <TabsContent value="sequences" className="mt-0">
                    <SequenceManager />
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
          <div className="lg:col-span-3 relative z-10">
            <StatusDashboard />
          </div>
        </div>
      </div>
    </div>
  );
}
