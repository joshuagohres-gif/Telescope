import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export type TimeRange = "tonight" | "week" | "month" | "year" | "all";

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "tonight", label: "Tonight" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

/**
 * Time range filter for skymap photos
 * Allows filtering photos by capture date
 */
export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>Time Range</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {TIME_RANGE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={value === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(option.value)}
            className="text-xs"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
