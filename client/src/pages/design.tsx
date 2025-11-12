import { useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Calculator, BookOpen, Telescope, Wrench, Lightbulb, Sparkles } from "lucide-react";
import { DesignWizard } from "@/design-kb/DesignWizard";
import { OpticalCalculator } from "@/design-kb/OpticalCalculator";
import { ConceptLibrary } from "@/design-kb/ConceptLibrary";
import { ExamplesBrowser } from "@/design-kb/ExamplesBrowser";
import { ProceduresViewer } from "@/design-kb/ProceduresViewer";
import { RulesOfThumbList } from "@/design-kb/RulesOfThumbList";

export default function DesignKnowledgeBase() {
  const [activeTab, setActiveTab] = useState("wizard");
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
            <h1 className="text-xl font-semibold">Telescope Design Knowledge Base</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto p-4">
        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="wizard" className="gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Wizard</span>
              </TabsTrigger>
              <TabsTrigger value="calculator" className="gap-2">
                <Calculator className="w-4 h-4" />
                <span className="hidden sm:inline">Calculator</span>
              </TabsTrigger>
              <TabsTrigger value="concepts" className="gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Concepts</span>
              </TabsTrigger>
              <TabsTrigger value="examples" className="gap-2">
                <Telescope className="w-4 h-4" />
                <span className="hidden sm:inline">Examples</span>
              </TabsTrigger>
              <TabsTrigger value="procedures" className="gap-2">
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Procedures</span>
              </TabsTrigger>
              <TabsTrigger value="rules" className="gap-2">
                <Lightbulb className="w-4 h-4" />
                <span className="hidden sm:inline">Rules</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="wizard" className="mt-0">
                <DesignWizard />
              </TabsContent>
              <TabsContent value="calculator" className="mt-0">
                <OpticalCalculator />
              </TabsContent>
              <TabsContent value="concepts" className="mt-0">
                <ConceptLibrary />
              </TabsContent>
              <TabsContent value="examples" className="mt-0">
                <ExamplesBrowser />
              </TabsContent>
              <TabsContent value="procedures" className="mt-0">
                <ProceduresViewer />
              </TabsContent>
              <TabsContent value="rules" className="mt-0">
                <RulesOfThumbList />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
