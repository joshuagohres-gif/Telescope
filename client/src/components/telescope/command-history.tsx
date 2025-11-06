import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Command } from "@shared/schema";
import { Clock, Star, Trash2, RotateCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CommandHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: commands, isLoading } = useQuery<Command[]>({
    queryKey: ["/api/commands/history"],
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (commandId: string) => {
      return await apiRequest("POST", `/api/commands/${commandId}/favorite`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commands/history"] });
    },
  });

  const repeatCommandMutation = useMutation({
    mutationFn: async (naturalLanguage: string) => {
      return await apiRequest("POST", "/api/commands/execute", { naturalLanguage });
    },
    onSuccess: () => {
      toast({ title: "Command repeated" });
      queryClient.invalidateQueries({ queryKey: ["/api/commands/history"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Command failed", description: error.message });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/commands/history", {});
    },
    onSuccess: () => {
      toast({ title: "History cleared" });
      queryClient.invalidateQueries({ queryKey: ["/api/commands/history"] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-telescope-connected/10 text-telescope-connected border-telescope-connected/30";
      case "failed":
        return "bg-telescope-error/10 text-telescope-error border-telescope-error/30";
      case "executing":
        return "bg-telescope-slewing/10 text-telescope-slewing border-telescope-slewing/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="p-6 flex flex-col h-[400px]" data-testid="card-command-history">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Command History</h2>
        </div>
        {commands && commands.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => clearHistoryMutation.mutate()}
            disabled={clearHistoryMutation.isPending}
            data-testid="button-clear-history"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 -mx-6 px-6">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && commands && commands.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No commands executed yet
          </div>
        )}

        {!isLoading && commands && commands.length > 0 && (
          <div className="space-y-3">
            {commands.map((command) => (
              <div
                key={command.id}
                className="p-3 rounded-md border border-border hover-elevate transition-colors"
                data-testid={`history-item-${command.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm flex-1 line-clamp-2">{command.naturalLanguage}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`flex-shrink-0 h-6 w-6 ${command.isFavorite ? 'text-yellow-500' : 'text-muted-foreground'}`}
                    onClick={() => toggleFavoriteMutation.mutate(command.id)}
                    data-testid={`button-favorite-${command.id}`}
                  >
                    <Star className={`w-3 h-3 ${command.isFavorite ? 'fill-current' : ''}`} />
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={`text-xs ${getStatusColor(command.status)}`}>
                      {command.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(command.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {command.status === "completed" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => repeatCommandMutation.mutate(command.naturalLanguage)}
                      disabled={repeatCommandMutation.isPending}
                      data-testid={`button-repeat-${command.id}`}
                    >
                      <RotateCw className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
