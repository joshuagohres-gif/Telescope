import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Telescope,
  Camera,
  Focus,
  Circle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Server,
  Info
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface AscomDevice {
  DeviceName: string;
  DeviceType: string;
  DeviceNumber: number;
  UniqueID: string;
}

interface ServerInfo {
  ServerName?: string;
  Manufacturer?: string;
  Version?: string;
  APIVersions?: number[];
}

const deviceIcons: Record<string, any> = {
  Telescope: Telescope,
  Camera: Camera,
  Focuser: Focus,
  default: Circle,
};

export function DeviceDiscovery() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Discover devices
  const {
    data: devices,
    isLoading: isDiscovering,
    error: discoveryError,
    refetch: discoverDevices
  } = useQuery<AscomDevice[]>({
    queryKey: ["/api/ascom/discover"],
    enabled: false, // Don't auto-fetch, only on manual trigger
    retry: false,
  });

  // Get server info
  const {
    data: serverInfo,
    refetch: fetchServerInfo
  } = useQuery<ServerInfo>({
    queryKey: ["/api/ascom/server-info"],
    enabled: false,
    retry: false,
  });

  // Connect to ASCOM mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/telescope/connect", { type: "ascom" });
    },
    onSuccess: () => {
      toast({ title: "Connected to ASCOM device" });
      queryClient.invalidateQueries({ queryKey: ["/api/telescope/status"] });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: error.message
      });
    },
  });

  const handleDiscover = async () => {
    await discoverDevices();
    await fetchServerInfo();
  };

  const DeviceIcon = ({ type }: { type: string }) => {
    const Icon = deviceIcons[type] || deviceIcons.default;
    return <Icon className="w-4 h-4" />;
  };

  const getDeviceTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "telescope":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "camera":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "focuser":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Discover Devices</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            ASCOM Device Discovery
          </DialogTitle>
          <DialogDescription>
            Discover and connect to ASCOM Alpaca devices on your network
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Discovery Controls */}
          <div className="flex gap-2">
            <Button
              onClick={handleDiscover}
              disabled={isDiscovering}
              className="flex-1"
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Discovering...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Discover Devices
                </>
              )}
            </Button>
          </div>

          {/* Server Information */}
          {serverInfo && (
            <Alert>
              <Server className="h-4 w-4" />
              <AlertTitle>ASCOM Server Found</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1 text-sm">
                  {serverInfo.ServerName && (
                    <div><strong>Server:</strong> {serverInfo.ServerName}</div>
                  )}
                  {serverInfo.Manufacturer && (
                    <div><strong>Manufacturer:</strong> {serverInfo.Manufacturer}</div>
                  )}
                  {serverInfo.Version && (
                    <div><strong>Version:</strong> {serverInfo.Version}</div>
                  )}
                  {serverInfo.APIVersions && (
                    <div><strong>API Versions:</strong> {serverInfo.APIVersions.join(", ")}</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {discoveryError && (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertTitle>Discovery Failed</AlertTitle>
              <AlertDescription>
                {(discoveryError as Error).message || "Could not connect to ASCOM server. Make sure an ASCOM Alpaca server is running on localhost:32323"}
              </AlertDescription>
            </Alert>
          )}

          {/* Discovered Devices */}
          {devices && devices.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-3">
                  Discovered Devices ({devices.length})
                </h3>
                <div className="space-y-2">
                  {devices.map((device, index) => (
                    <Card key={`${device.UniqueID}-${index}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <DeviceIcon type={device.DeviceType} />
                            <div>
                              <CardTitle className="text-base">
                                {device.DeviceName}
                              </CardTitle>
                              <CardDescription className="text-xs mt-1">
                                Device #{device.DeviceNumber} • ID: {device.UniqueID?.substring(0, 8)}...
                              </CardDescription>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getDeviceTypeColor(device.DeviceType)}`}
                          >
                            {device.DeviceType}
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* No Devices Found */}
          {devices && devices.length === 0 && !discoveryError && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Devices Found</AlertTitle>
              <AlertDescription>
                No ASCOM devices are currently configured on the server. Configure devices in your ASCOM Alpaca server and try again.
              </AlertDescription>
            </Alert>
          )}

          {/* Connection Button */}
          {devices && devices.length > 0 && (
            <>
              <Separator />
              <div className="flex gap-2">
                <Button
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                  className="flex-1"
                >
                  {connectMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Connect to ASCOM
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Help Text */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Getting Started</AlertTitle>
            <AlertDescription className="text-xs mt-2 space-y-1">
              <p>1. Ensure ASCOM Alpaca server is running (default: localhost:32323)</p>
              <p>2. Click "Discover Devices" to scan for available devices</p>
              <p>3. Review the discovered devices and click "Connect to ASCOM"</p>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
