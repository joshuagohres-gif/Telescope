import { useState } from "react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ExposureRecipePlanner, SessionQASummary } from "@/planqa";
import { Lightbulb, CheckCircle2, ArrowLeft } from "lucide-react";

export default function PlanQA() {
  const [activeTab, setActiveTab] = useState("recipe");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">Planning & Quality Assurance</h1>
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
          <TabsList className="grid grid-cols-2 w-full max-w-lg mx-auto">
            <TabsTrigger value="recipe" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              <span>Exposure Recipe</span>
            </TabsTrigger>
            <TabsTrigger value="qa" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Session QA</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="recipe" className="mt-0">
              <ExposureRecipePlanner />
            </TabsContent>
            <TabsContent value="qa" className="mt-0">
              <SessionQASummary />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
