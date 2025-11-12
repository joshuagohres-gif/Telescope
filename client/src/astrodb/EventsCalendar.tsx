import { useState, useMemo } from "react";
import { useAstronomicalEvents } from "@/hooks/use-astrodb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "./EventCard";

const EVENT_TYPES = [
  "Eclipse",
  "Conjunction",
  "Opposition",
  "Meteor Shower",
  "Occultation",
  "Transit",
  "Equinox",
  "Solstice",
];

export function EventsCalendar() {
  const [eventType, setEventType] = useState<string>("");
  const [monthsAhead, setMonthsAhead] = useState(6);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    const future = new Date();
    future.setMonth(future.getMonth() + monthsAhead);
    return { from: now, to: future };
  }, [monthsAhead]);

  const { data, isLoading, error } = useAstronomicalEvents({
    type: eventType || undefined,
    from: dateRange.from,
    to: dateRange.to,
    page,
    pageSize,
  });

  const events = data?.data || [];
  const pagination = data?.pagination;

  // Group events by month
  const eventsByMonth = useMemo(() => {
    const grouped: Record<string, typeof events> = {};
    events.forEach((event) => {
      const date = new Date(event.eventTime);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(event);
    });
    return grouped;
  }, [events]);

  const getMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split("-").map(Number);
    const date = new Date(year, month);
    return date.toLocaleDateString([], { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Event Type</label>
            <Select value={eventType || undefined} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue placeholder="All Event Types" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {eventType && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs mt-1" onClick={() => setEventType("")}>
                Clear filter
              </Button>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Time Range</label>
            <Select
              value={monthsAhead.toString()}
              onValueChange={(value) => setMonthsAhead(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Next month</SelectItem>
                <SelectItem value="3">Next 3 months</SelectItem>
                <SelectItem value="6">Next 6 months</SelectItem>
                <SelectItem value="12">Next year</SelectItem>
                <SelectItem value="24">Next 2 years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Event List */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-6 h-32 animate-pulse bg-muted" />
          ))}
        </div>
      )}

      {error && (
        <Card className="p-8 text-center">
          <p className="text-destructive">Error loading events: {error.message}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Card>
      )}

      {!isLoading && !error && events.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No events found in the selected time period.</p>
          <p className="text-sm mt-2">Try extending the time range or changing filters.</p>
        </Card>
      )}

      {!isLoading && !error && events.length > 0 && (
        <div className="space-y-8">
          {Object.entries(eventsByMonth).map(([monthKey, monthEvents]) => (
            <div key={monthKey}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {getMonthLabel(monthKey)}
                <span className="text-sm font-normal text-muted-foreground">
                  ({monthEvents.length} event{monthEvents.length !== 1 ? "s" : ""})
                </span>
              </h3>
              <div className="space-y-3">
                {monthEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
