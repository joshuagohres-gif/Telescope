import { useState } from "react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MasterLibraryBrowser, AutofocusPlanner, FocusProfileManager } from "@/calibration";
import { Settings, Database, TrendingUp, FileText, ArrowLeft } from "lucide-react";

export default function Calibration() {
  const [activeTab, setActiveTab] = useState("library");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">Calibration & Focus Management</h1>
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
          <TabsList className="grid grid-cols-3 w-full max-w-2xl mx-auto">
            <TabsTrigger value="library" className="gap-2">
              <Database className="w-4 h-4" />
              <span>Master Library</span>
            </TabsTrigger>
            <TabsTrigger value="autofocus" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>Autofocus Planner</span>
            </TabsTrigger>
            <TabsTrigger value="profiles" className="gap-2">
              <FileText className="w-4 h-4" />
              <span>Focus Profiles</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="library" className="mt-0">
              <MasterLibraryBrowser />
            </TabsContent>
            <TabsContent value="autofocus" className="mt-0">
              <AutofocusPlanner />
            </TabsContent>
            <TabsContent value="profiles" className="mt-0">
              <FocusProfileManager />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
