import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CircleStop, ParkingSquare } from "lucide-react";

export function EmergencyControls() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const emergencyStopMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/telescope/emergency-stop", {});
    },
    onSuccess: () => {
      toast({ 
        title: "Emergency Stop Activated",
        description: "All telescope motion has been halted.",
        variant: "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/telescope/status"] });
    },
  });

  const parkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/telescope/park", {});
    },
    onSuccess: () => {
      toast({ 
        title: "Parking Telescope",
        description: "Moving to park position."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/telescope/status"] });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Park failed", 
        description: error.message 
      });
    },
  });

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => parkMutation.mutate()}
        disabled={parkMutation.isPending}
        className="gap-2"
        data-testid="button-park"
      >
        <ParkingSquare className="w-4 h-4" />
        <span className="hidden sm:inline">Park</span>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            data-testid="button-emergency-stop-trigger"
          >
            <CircleStop className="w-4 h-4" />
            <span className="hidden sm:inline">Stop</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emergency Stop</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately halt all telescope, camera, and focuser motion. 
              Use this only in emergency situations. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-emergency">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => emergencyStopMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-emergency"
            >
              Emergency Stop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
