import { type CatalogObject } from "@/hooks/use-astrodb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Telescope, MapPin } from "lucide-react";

interface ObjectCardProps {
  object: CatalogObject;
  onSelect: () => void;
  isSelected: boolean;
}

export function ObjectCard({ object, onSelect, isSelected }: ObjectCardProps) {
  const getObjectTypeColor = (cls: string) => {
    const lowerCls = cls.toLowerCase();
    if (lowerCls.includes("galaxy")) return "bg-purple-500/20 text-purple-700 border-purple-500/30";
    if (lowerCls.includes("nebula")) return "bg-blue-500/20 text-blue-700 border-blue-500/30";
    if (lowerCls.includes("cluster")) return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
    if (lowerCls.includes("star")) return "bg-orange-500/20 text-orange-700 border-orange-500/30";
    return "bg-gray-500/20 text-gray-700 border-gray-500/30";
  };

  const formatCoordinates = (ra: number, dec: number) => {
    const raHours = Math.floor(ra);
    const raMinutes = Math.floor((ra - raHours) * 60);
    const raSeconds = ((ra - raHours) * 60 - raMinutes) * 60;

    const decDegrees = Math.floor(Math.abs(dec));
    const decMinutes = Math.floor((Math.abs(dec) - decDegrees) * 60);
    const decSign = dec >= 0 ? "+" : "-";

    return `${raHours.toString().padStart(2, "0")}h ${raMinutes.toString().padStart(2, "0")}m ${raSeconds.toFixed(0).padStart(2, "0")}s, ${decSign}${decDegrees}° ${decMinutes}'`;
  };

  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Names */}
          <div className="flex items-start gap-2 mb-2">
            <Telescope className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg line-clamp-1">
                {object.names[0]}
              </h3>
              {object.names.length > 1 && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {object.names.slice(1).join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">
                {formatCoordinates(object.ra, object.dec)}
              </span>
            </div>
            {object.constellation && (
              <div className="text-right">
                <span className="text-muted-foreground">in </span>
                <span className="font-medium">{object.constellation}</span>
              </div>
            )}
            {object.magnitude !== null && (
              <div>
                <span className="text-muted-foreground">Mag: </span>
                <span className="font-medium">{object.magnitude.toFixed(1)}</span>
              </div>
            )}
            {object.sizeArcmin !== null && (
              <div className="text-right">
                <span className="text-muted-foreground">Size: </span>
                <span className="font-medium">{object.sizeArcmin.toFixed(1)}'</span>
              </div>
            )}
          </div>
        </div>

        {/* Object Type Badge */}
        <Badge className={getObjectTypeColor(object.class)}>
          {object.class}
        </Badge>
      </div>
    </Card>
  );
}
