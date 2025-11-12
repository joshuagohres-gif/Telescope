import { useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Telescope, Search, Satellite, Calendar, Lightbulb } from "lucide-react";
import { EquipmentBrowser } from "@/astrodb/EquipmentBrowser";
import { CatalogExplorer } from "@/astrodb/CatalogExplorer";
import { SatellitePassPredictor } from "@/astrodb/SatellitePassPredictor";
import { EventsCalendar } from "@/astrodb/EventsCalendar";
import { EquipmentRecommender } from "@/astrodb/EquipmentRecommender";

export default function AstroDB() {
  const [activeTab, setActiveTab] = useState("equipment");
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <Telescope className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">AstroDB - Equipment & Catalog</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto p-4">
        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="equipment" className="gap-2">
                <Telescope className="w-4 h-4" />
                <span className="hidden sm:inline">Equipment</span>
              </TabsTrigger>
              <TabsTrigger value="catalog" className="gap-2">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">DSO Catalog</span>
              </TabsTrigger>
              <TabsTrigger value="satellites" className="gap-2">
                <Satellite className="w-4 h-4" />
                <span className="hidden sm:inline">Satellites</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Events</span>
              </TabsTrigger>
              <TabsTrigger value="recommend" className="gap-2">
                <Lightbulb className="w-4 h-4" />
                <span className="hidden sm:inline">Recommendations</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="equipment" className="mt-0">
                <EquipmentBrowser />
              </TabsContent>
              <TabsContent value="catalog" className="mt-0">
                <CatalogExplorer />
              </TabsContent>
              <TabsContent value="satellites" className="mt-0">
                <SatellitePassPredictor />
              </TabsContent>
              <TabsContent value="events" className="mt-0">
                <EventsCalendar />
              </TabsContent>
              <TabsContent value="recommend" className="mt-0">
                <EquipmentRecommender />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
