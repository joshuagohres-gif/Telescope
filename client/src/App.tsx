import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useWebSocket } from "@/hooks/use-websocket";
import Dashboard from "@/pages/dashboard";
import Operations from "@/pages/operations";
import PlanQA from "@/pages/planqa";
import Calibration from "@/pages/calibration";
import SkyMap from "@/pages/skymap";
import AstroDB from "@/pages/astrodb";
import DesignKB from "@/pages/design";
import LiquidGlassDemo from "@/pages/LiquidGlassDemo";
import SkyVisualizers from "@/pages/sky-visualizers";
import NotFound from "@/pages/not-found";

function Router() {
  // Initialize WebSocket connection
  useWebSocket();

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/operations" component={Operations} />
      <Route path="/planqa" component={PlanQA} />
      <Route path="/calibration" component={Calibration} />
      <Route path="/skymap" component={SkyMap} />
      <Route path="/astrodb" component={AstroDB} />
      <Route path="/design" component={DesignKB} />
      <Route path="/liquid-glass" component={LiquidGlassDemo} />
      <Route path="/sky-visualizers" component={SkyVisualizers} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
