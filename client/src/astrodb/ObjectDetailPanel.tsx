import { useState } from "react";
import { type CatalogObject } from "@/hooks/use-astrodb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Telescope, MapPin, Eye, X } from "lucide-react";

interface ObjectDetailPanelProps {
  object: CatalogObject;
  onClose: () => void;
}

export function ObjectDetailPanel({ object, onClose }: ObjectDetailPanelProps) {
  const { toast } = useToast();
  const [isSlewingToObject, setIsSlewingToObject] = useState(false);

  const formatRA = (ra: number) => {
    const hours = Math.floor(ra);
    const minutes = Math.floor((ra - hours) * 60);
    const seconds = ((ra - hours) * 60 - minutes) * 60;
    return `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toFixed(1).padStart(4, "0")}s`;
  };

  const formatDec = (dec: number) => {
    const degrees = Math.floor(Math.abs(dec));
    const minutes = Math.floor((Math.abs(dec) - degrees) * 60);
    const seconds = ((Math.abs(dec) - degrees) * 60 - minutes) * 60;
    const sign = dec >= 0 ? "+" : "-";
    return `${sign}${degrees}° ${minutes}' ${seconds.toFixed(1)}"`;
  };

  const handleSlewToObject = async () => {
    setIsSlewingToObject(true);
    try {
      // Use the existing telescope tracking API
      const response = await fetch("/api/telescope/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: object.names[0] }),
      });

      if (!response.ok) {
        throw new Error("Failed to slew telescope");
      }

      toast({
        title: "Slewing to target",
        description: `Telescope is slewing to ${object.names[0]}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to slew telescope",
        variant: "destructive",
      });
    } finally {
      setIsSlewingToObject(false);
    }
  };

  return (
    <Card className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{object.names[0]}</h2>
            {object.names.length > 1 && (
              <p className="text-sm text-muted-foreground mt-1">
                Also known as: {object.names.slice(1).join(", ")}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <Badge className="text-sm">{object.class}</Badge>

        <Separator />

        {/* Coordinates */}
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Coordinates (J2000)
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Right Ascension:</span>
              <span className="font-mono">{formatRA(object.ra)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Declination:</span>
              <span className="font-mono">{formatDec(object.dec)}</span>
            </div>
          </div>
        </div>

        {/* Physical Properties */}
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Observable Properties
          </h3>
          <div className="space-y-1 text-sm">
            {object.constellation && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Constellation:</span>
                <span className="font-medium">{object.constellation}</span>
              </div>
            )}
            {object.magnitude !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Apparent Magnitude:</span>
                <span className="font-medium">{object.magnitude.toFixed(2)}</span>
              </div>
            )}
            {object.surfaceBrightness !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Surface Brightness:</span>
                <span className="font-medium">{object.surfaceBrightness.toFixed(1)} mag/arcsec²</span>
              </div>
            )}
            {object.sizeArcmin !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Angular Size:</span>
                <span className="font-medium">{object.sizeArcmin.toFixed(1)} arcmin</span>
              </div>
            )}
            {object.distance && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Distance:</span>
                <span className="font-medium">{object.distance}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {object.notes && (
          <div>
            <h3 className="font-semibold mb-2">Notes</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {object.notes}
            </p>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={handleSlewToObject}
            disabled={isSlewingToObject}
          >
            <Telescope className="w-4 h-4 mr-2" />
            {isSlewingToObject ? "Slewing..." : "Slew Telescope to Object"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Make sure your telescope is connected before slewing
          </p>
        </div>
      </div>
    </Card>
  );
}
