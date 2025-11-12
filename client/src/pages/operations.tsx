import { useState } from "react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  SiteManager,
  HorizonEditor,
  WeatherDashboard,
  LightPollutionMap,
  DewRiskCalculator,
  SessionPlanner,
  MultiSiteComparison,
  ConditionAlerts
} from "@/ops";
import { Telescope, MapPin, Mountain, CloudRain, Sun, ArrowLeft, Droplets, Calendar, TrendingUp, Bell } from "lucide-react";

export default function Operations() {
  const [activeTab, setActiveTab] = useState("sites");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">Observatory Operations</h1>
          </div>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Telescope Control
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full max-w-6xl mx-auto">
            <TabsTrigger value="sites" className="gap-2">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Sites</span>
            </TabsTrigger>
            <TabsTrigger value="weather" className="gap-2">
              <CloudRain className="w-4 h-4" />
              <span className="hidden sm:inline">Weather</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Compare</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="dew" className="gap-2">
              <Droplets className="w-4 h-4" />
              <span className="hidden sm:inline">Dew</span>
            </TabsTrigger>
            <TabsTrigger value="planner" className="gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Planner</span>
            </TabsTrigger>
            <TabsTrigger value="horizon" className="gap-2">
              <Mountain className="w-4 h-4" />
              <span className="hidden sm:inline">Horizon</span>
            </TabsTrigger>
            <TabsTrigger value="pollution" className="gap-2">
              <Sun className="w-4 h-4" />
              <span className="hidden sm:inline">Sky</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="sites" className="mt-0">
              <SiteManager />
            </TabsContent>
            <TabsContent value="weather" className="mt-0">
              <WeatherDashboard />
            </TabsContent>
            <TabsContent value="comparison" className="mt-0">
              <MultiSiteComparison />
            </TabsContent>
            <TabsContent value="alerts" className="mt-0">
              <ConditionAlerts />
            </TabsContent>
            <TabsContent value="dew" className="mt-0">
              <DewRiskCalculator />
            </TabsContent>
            <TabsContent value="planner" className="mt-0">
              <SessionPlanner />
            </TabsContent>
            <TabsContent value="horizon" className="mt-0">
              <HorizonEditor />
            </TabsContent>
            <TabsContent value="pollution" className="mt-0">
              <LightPollutionMap />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
