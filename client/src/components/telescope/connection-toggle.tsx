import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Wifi, WifiOff, Circle } from "lucide-react";

export function ConnectionToggle() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ["/api/telescope/status"],
    refetchInterval: 1000,
  });

  const connectMutation = useMutation({
    mutationFn: async (type: "mock" | "ascom") => {
      return await apiRequest("POST", "/api/telescope/connect", { type });
    },
    onSuccess: (_, type) => {
      toast({ title: `Connected to ${type.toUpperCase()}` });
      queryClient.invalidateQueries({ queryKey: ["/api/telescope/status"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Connection failed", description: error.message });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/telescope/disconnect", {});
    },
    onSuccess: () => {
      toast({ title: "Disconnected" });
      queryClient.invalidateQueries({ queryKey: ["/api/telescope/status"] });
    },
  });

  const isConnected = status?.telescope?.connected ?? false;
  const connectionType = status?.telescope?.connectionType;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isConnected ? "default" : "outline"}
          size="sm"
          className="gap-2"
          data-testid="button-connection-toggle"
        >
          {isConnected ? (
            <>
              <Circle className="w-3 h-3 fill-telescope-connected text-telescope-connected animate-pulse" />
              <Wifi className="w-4 h-4" />
              <span className="hidden sm:inline">Connected</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {connectionType?.toUpperCase()}
              </Badge>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span className="hidden sm:inline">Disconnected</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Connection</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {!isConnected ? (
          <>
            <DropdownMenuItem
              onClick={() => connectMutation.mutate("mock")}
              disabled={connectMutation.isPending}
              data-testid="menu-connect-mock"
            >
              <Circle className="w-3 h-3 mr-2" />
              Connect to Mock Simulator
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => connectMutation.mutate("ascom")}
              disabled={connectMutation.isPending}
              data-testid="menu-connect-ascom"
            >
              <Circle className="w-3 h-3 mr-2" />
              Connect to ASCOM
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="text-destructive"
              data-testid="menu-disconnect"
            >
              <WifiOff className="w-4 h-4 mr-2" />
              Disconnect
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
