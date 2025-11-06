import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function CommandInput() {
  const [command, setCommand] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const executeCommandMutation = useMutation({
    mutationFn: async (naturalLanguage: string) => {
      return await apiRequest("POST", "/api/commands/execute", { naturalLanguage });
    },
    onSuccess: () => {
      toast({
        title: "Command Executing",
        description: "Your command is being processed.",
      });
      setCommand("");
      queryClient.invalidateQueries({ queryKey: ["/api/commands/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/telescope/status"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Command Failed",
        description: error.message || "Failed to execute command",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim()) {
      executeCommandMutation.mutate(command.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Card className="p-6" data-testid="card-command-input">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Natural Language Command</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Try: "Point to Andromeda Galaxy" or "Track Mars and capture 30s exposure"'
          className="min-h-[120px] resize-none text-base"
          data-testid="input-command"
        />
        
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Cmd/Ctrl + Enter</kbd> to submit
          </p>
          <Button 
            type="submit" 
            disabled={!command.trim() || executeCommandMutation.isPending}
            className="gap-2"
            data-testid="button-send-command"
          >
            <Send className="w-4 h-4" />
            Send Command
          </Button>
        </div>
      </form>

      {executeCommandMutation.isPending && (
        <div className="mt-4 p-3 rounded-md bg-muted/50 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Processing command...</p>
          </div>
        </div>
      )}
    </Card>
  );
}
