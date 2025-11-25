import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface SolarSystemObject {
  id: number;
  name: string;
  designation: string | null;
  type: string;
}

interface ObjectSelectorProps {
  selectedIds: number[];
  onSelect: (ids: number[]) => void;
}

export function ObjectSelector({ selectedIds, onSelect }: ObjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["sky-visualizers-objects", typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
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

  // Fetch details for selected objects (to display names correctly even if not in current filter list)
  const { data: selectedObjects } = useQuery({
    queryKey: ["sky-visualizers-selected-objects", selectedIds],
    queryFn: async () => {
      if (selectedIds.length === 0) return [];
      const promises = selectedIds.map(id => 
        fetch(`/api/sky-visualizers/objects/${id}`).then(r => r.json()).then(r => r.data)
      );
      return Promise.all(promises) as Promise<SolarSystemObject[]>;
    },
    enabled: selectedIds.length > 0
  });

  const handleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter((i) => i !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Solar System Objects</Label>
      
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

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedIds.length > 0
              ? `${selectedIds.length} selected`
              : "Select objects..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Search objects..." />
            <CommandList>
              <CommandEmpty>No objects found.</CommandEmpty>
              <CommandGroup>
                {isLoading ? (
                  <div className="flex justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  data?.map((obj) => (
                    <CommandItem
                      key={obj.id}
                      value={obj.name}
                      onSelect={() => handleSelect(obj.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedIds.includes(obj.id)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {obj.name}
                      {obj.designation && <span className="ml-1 text-muted-foreground text-xs">({obj.designation})</span>}
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Tags */}
      <div className="flex flex-wrap gap-2 mt-2">
        {selectedObjects?.map((obj) => (
            <Badge key={obj.id} variant="secondary" className="cursor-pointer" onClick={() => handleSelect(obj.id)}>
                {obj.name}
                <X className="ml-1 h-3 w-3" />
            </Badge>
        ))}
      </div>
    </div>
  );
}
