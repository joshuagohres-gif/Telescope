import { type AstronomicalEvent } from "@/hooks/use-astrodb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Info } from "lucide-react";

interface EventCardProps {
  event: AstronomicalEvent;
}

export function EventCard({ event }: EventCardProps) {
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const getEventTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes("eclipse")) return "bg-purple-500/20 text-purple-700 border-purple-500/30";
    if (lowerType.includes("conjunction")) return "bg-blue-500/20 text-blue-700 border-blue-500/30";
    if (lowerType.includes("meteor")) return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
    if (lowerType.includes("opposition")) return "bg-orange-500/20 text-orange-700 border-orange-500/30";
    return "bg-gray-500/20 text-gray-700 border-gray-500/30";
  };

  const { date: startDate, time: startTime } = formatDateTime(event.eventTime);
  const hasEndTime = event.endTime && event.endTime !== event.eventTime;
  const endInfo = hasEndTime ? formatDateTime(event.endTime!) : null;

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{event.name}</h3>
              {event.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {event.description}
                </p>
              )}
            </div>
          </div>

          {/* Time Information */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{startDate}</p>
                <p className="text-muted-foreground">{startTime}</p>
              </div>
            </div>
            {endInfo && (
              <>
                <span className="text-muted-foreground">→</span>
                <div>
                  <p className="font-medium">{endInfo.date}</p>
                  <p className="text-muted-foreground">{endInfo.time}</p>
                </div>
              </>
            )}
          </div>

          {/* Location Information */}
          {(event.country || event.continent) && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Visible from:</span>
              <span className="font-medium">
                {event.country ? `${event.country}` : ""}
                {event.country && event.continent ? ", " : ""}
                {event.continent || ""}
              </span>
            </div>
          )}

          {/* Additional Notes */}
          {event.notes && (
            <div className="flex items-start gap-2 text-sm bg-muted/30 p-3 rounded-lg">
              <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-muted-foreground">{event.notes}</p>
            </div>
          )}
        </div>

        {/* Event Type Badge */}
        <Badge className={getEventTypeColor(event.type)}>
          {event.type}
        </Badge>
      </div>
    </Card>
  );
}
