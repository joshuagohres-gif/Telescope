import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface SolarSystemObject {
  id: number;
  name: string;
  designation: string | null;
  type: string;
}

interface ObjectSelectorProps {
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

export function ObjectSelector({ selectedId, onSelect }: ObjectSelectorProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["sky-visualizers-objects", search, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("type", typeFilter);
      params.set("limit", "100");

      const response = await fetch(
        `/api/sky-visualizers/objects?${params}`
      );
      if (!response.ok) throw new Error("Failed to fetch objects");
      const result = await response.json();
      return result.data as SolarSystemObject[];
    },
  });

  const { data: selectedObject } = useQuery({
    queryKey: ["sky-visualizers-object", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const response = await fetch(
        `/api/sky-visualizers/objects/${selectedId}`
      );
      if (!response.ok) throw new Error("Failed to fetch object");
      const result = await response.json();
      return result.data as SolarSystemObject;
    },
    enabled: !!selectedId,
  });

  return (
    <div className="space-y-2">
      <Label>Solar System Object</Label>
      <div className="space-y-2">
        <Input
          placeholder="Search objects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="planet">Planets</SelectItem>
            <SelectItem value="dwarf_planet">Dwarf Planets</SelectItem>
            <SelectItem value="comet">Comets</SelectItem>
            <SelectItem value="asteroid">Asteroids</SelectItem>
            <SelectItem value="moon">Moons</SelectItem>
            <SelectItem value="neo">Near-Earth Objects</SelectItem>
          </SelectContent>
        </Select>
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive p-2">
            Error loading objects
          </div>
        ) : (
          <Select
            value={selectedId?.toString() || ""}
            onValueChange={(v) => onSelect(v ? parseInt(v, 10) : null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an object" />
            </SelectTrigger>
            <SelectContent>
              {data?.map((obj) => (
                <SelectItem key={obj.id} value={obj.id.toString()}>
                  {obj.name}
                  {obj.designation && ` (${obj.designation})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {selectedObject && (
        <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
          <div className="font-medium">{selectedObject.name}</div>
          <div className="text-xs">Type: {selectedObject.type}</div>
        </div>
      )}
    </div>
  );
}
