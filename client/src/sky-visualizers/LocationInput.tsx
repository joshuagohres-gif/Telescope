import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

interface LocationInputProps {
  lat: number;
  lon: number;
  onChange: (location: { lat: number; lon: number }) => void;
}

export function LocationInput({ lat, lon, onChange }: LocationInputProps) {
  const handleLatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= -90 && value <= 90) {
      onChange({ lat: value, lon });
    }
  };

  const handleLonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= -180 && value <= 180) {
      onChange({ lat, lon: value });
    }
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onChange({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  return (
    <div className="space-y-2">
      <Label>Observer Location</Label>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="lat" className="text-xs">
              Latitude
            </Label>
            <Input
              id="lat"
              type="number"
              step="0.0001"
              min="-90"
              max="90"
              value={lat}
              onChange={handleLatChange}
              placeholder="40.7128"
            />
          </div>
          <div>
            <Label htmlFor="lon" className="text-xs">
              Longitude
            </Label>
            <Input
              id="lon"
              type="number"
              step="0.0001"
              min="-180"
              max="180"
              value={lon}
              onChange={handleLonChange}
              placeholder="-74.0060"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={useCurrentLocation}
          className="w-full"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Use Current Location
        </Button>
      </div>
    </div>
  );
}
