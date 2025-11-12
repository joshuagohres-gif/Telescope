import { useState, useMemo } from "react";
import { useSatellites, useSatellitePasses } from "@/hooks/use-astrodb";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Satellite, MapPin, Calendar } from "lucide-react";
import { PassTimeline } from "./PassTimeline";
import { PassDetailsCard } from "./PassDetailsCard";

export function SatellitePassPredictor() {
  // Observer location (default: San Francisco)
  const [latitude, setLatitude] = useState("37.7749");
  const [longitude, setLongitude] = useState("-122.4194");
  const [altitude, setAltitude] = useState("0");

  // Date range (default: next 7 days)
  const [daysAhead, setDaysAhead] = useState(7);

  // Selected satellite
  const [selectedNoradId, setSelectedNoradId] = useState<number | null>(25544); // ISS

  const { data: satellitesData } = useSatellites({ brightFirst: true, pageSize: 50 });
  const satellites = satellitesData?.data || [];

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);
    return { from: now, to: future };
  }, [daysAhead]);

  // Fetch satellite passes
  const passParams = useMemo(() => {
    if (!selectedNoradId) return null;
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const altM = parseFloat(altitude);
    if (isNaN(lat) || isNaN(lon) || isNaN(altM)) return null;

    return {
      noradId: selectedNoradId,
      lat,
      lon,
      altM,
      from: dateRange.from,
      to: dateRange.to,
    };
  }, [selectedNoradId, latitude, longitude, altitude, dateRange]);

  const { data: passesData, isLoading, error } = useSatellitePasses(passParams);
  const passes = passesData?.data.passes || [];
  const selectedSatellite = satellites.find((s) => s.noradId === selectedNoradId);

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Satellite className="w-5 h-5" />
              Satellite Selection
            </h3>
            <Select
              value={selectedNoradId?.toString()}
              onValueChange={(value) => setSelectedNoradId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select satellite..." />
              </SelectTrigger>
              <SelectContent>
                {satellites.map((sat) => (
                  <SelectItem key={sat.noradId} value={sat.noradId.toString()}>
                    {sat.name} (NORAD: {sat.noradId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Observer Location
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Latitude</label>
                <Input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="37.7749"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Longitude</label>
                <Input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="-122.4194"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Altitude (m)</label>
                <Input
                  type="number"
                  value={altitude}
                  onChange={(e) => setAltitude(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Prediction Period
            </h3>
            <Select
              value={daysAhead.toString()}
              onValueChange={(value) => setDaysAhead(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Next 24 hours</SelectItem>
                <SelectItem value="3">Next 3 days</SelectItem>
                <SelectItem value="7">Next 7 days</SelectItem>
                <SelectItem value="14">Next 14 days</SelectItem>
                <SelectItem value="30">Next 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Results */}
      {selectedSatellite && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">
            {selectedSatellite.name} Passes
          </h3>

          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              <p>Calculating satellite passes...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">Error: {error.message}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !error && passes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No visible passes found for this satellite in the selected time period.</p>
              <p className="text-sm mt-2">Try extending the prediction period.</p>
            </div>
          )}

          {!isLoading && !error && passes.length > 0 && (
            <div className="space-y-6">
              {/* Timeline */}
              <PassTimeline passes={passes} />

              {/* Pass Details */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">
                  {passes.length} pass{passes.length !== 1 ? "es" : ""} found
                </h4>
                {passes.map((pass, index) => (
                  <PassDetailsCard key={index} pass={pass} index={index} />
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
