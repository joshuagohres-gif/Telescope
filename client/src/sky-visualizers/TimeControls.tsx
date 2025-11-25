import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";

// Helper to convert Date to Julian Date
function toJulianDate(date: Date): number {
  return (date.getTime() / 86400000) + 2440587.5;
}

// Helper to convert Julian Date to Date
function fromJulianDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

interface TimeControlsProps {
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
}

export function TimeControls({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: TimeControlsProps) {
  const [useJD, setUseJD] = useState(false);
  const [startJD, setStartJD] = useState(toJulianDate(startDate).toString());
  const [endJD, setEndJD] = useState(toJulianDate(endDate).toString());

  // Sync JD inputs when dates change (if not editing JD)
  useEffect(() => {
    if (!useJD) {
      setStartJD(toJulianDate(startDate).toFixed(5));
      setEndJD(toJulianDate(endDate).toFixed(5));
    }
  }, [startDate, endDate, useJD]);

  const handleStartJDChange = (val: string) => {
    setStartJD(val);
    const jd = parseFloat(val);
    if (!isNaN(jd)) {
      onStartDateChange(fromJulianDate(jd));
    }
  };

  const handleEndJDChange = (val: string) => {
    setEndJD(val);
    const jd = parseFloat(val);
    if (!isNaN(jd)) {
      onEndDateChange(fromJulianDate(jd));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Time Range</Label>
        <div className="flex items-center gap-2">
            <Label htmlFor="jd-mode" className="text-xs text-muted-foreground">JD Input</Label>
            <Switch id="jd-mode" checked={useJD} onCheckedChange={setUseJD} />
        </div>
      </div>

      {useJD ? (
        <div className="space-y-2">
          <div>
            <Label htmlFor="start-jd" className="text-xs">Start JD</Label>
            <Input 
                id="start-jd" 
                value={startJD} 
                onChange={(e) => handleStartJDChange(e.target.value)} 
            />
          </div>
          <div>
            <Label htmlFor="end-jd" className="text-xs">End JD</Label>
            <Input 
                id="end-jd" 
                value={endJD} 
                onChange={(e) => handleEndJDChange(e.target.value)} 
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <Label htmlFor="start-date" className="text-xs">
              Start Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="start-date"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && onStartDateChange(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="end-date" className="text-xs">
              End Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="end-date"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(endDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => date && onEndDateChange(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
      
      <Button 
        variant="secondary" 
        size="sm" 
        className="w-full"
        onClick={() => {
            const now = new Date();
            onStartDateChange(now);
            onEndDateChange(new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000));
        }}
      >
        <Clock className="w-3 h-3 mr-2" />
        Reset to Now
      </Button>
    </div>
  );
}
