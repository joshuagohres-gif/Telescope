import { useState } from "react";
import { useCatalogObjects, type CatalogObject } from "@/hooks/use-astrodb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { ObjectCard } from "./ObjectCard";
import { ObjectDetailPanel } from "./ObjectDetailPanel";

const CONSTELLATIONS = [
  "Andromeda", "Aquarius", "Aquila", "Aries", "Auriga", "Boötes", "Cancer",
  "Canis Major", "Canis Minor", "Capricornus", "Cassiopeia", "Cepheus",
  "Cetus", "Cygnus", "Draco", "Gemini", "Hercules", "Leo", "Libra",
  "Lyra", "Ophiuchus", "Orion", "Pegasus", "Perseus", "Pisces", "Sagittarius",
  "Scorpius", "Taurus", "Ursa Major", "Ursa Minor", "Virgo",
];

const OBJECT_CLASSES = [
  "Galaxy", "Nebula", "Planetary Nebula", "Open Cluster", "Globular Cluster",
  "Double Star", "Variable Star", "Supernova Remnant",
];

export function CatalogExplorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [objectClass, setObjectClass] = useState<string>("");
  const [constellation, setConstellation] = useState<string>("");
  const [maxMagnitude, setMaxMagnitude] = useState([15]);
  const [selectedObject, setSelectedObject] = useState<CatalogObject | null>(null);
  const [page, setPage] = useState(1);
  const [coneSearch, setConeSearch] = useState<{
    ra: number;
    dec: number;
    radius: number;
  } | null>(null);
  const pageSize = 20;

  const { data, isLoading, error } = useCatalogObjects({
    class: objectClass || undefined,
    constellation: constellation || undefined,
    magLte: maxMagnitude[0],
    q: searchQuery || undefined,
    nearRa: coneSearch?.ra,
    nearDec: coneSearch?.dec,
    radiusDeg: coneSearch?.radius,
    page,
    pageSize,
  });

  const objects = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel: Filters + Object List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Filters */}
        <Card className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search objects (M31, NGC 7000, Andromeda Galaxy...)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Select
                value={objectClass || undefined}
                onValueChange={(value) => {
                  setObjectClass(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Object Types" />
                </SelectTrigger>
                <SelectContent>
                  {OBJECT_CLASSES.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {objectClass && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setObjectClass("")}>
                  Clear filter
                </Button>
              )}
            </div>

            <div className="space-y-1">
              <Select
                value={constellation || undefined}
                onValueChange={(value) => {
                  setConstellation(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Constellations" />
                </SelectTrigger>
                <SelectContent>
                  {CONSTELLATIONS.map((const_name) => (
                    <SelectItem key={const_name} value={const_name}>
                      {const_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {constellation && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setConstellation("")}>
                  Clear filter
                </Button>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                Max Magnitude: {maxMagnitude[0]}
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMaxMagnitude([15])}
              >
                Reset
              </Button>
            </div>
            <Slider
              value={maxMagnitude}
              onValueChange={setMaxMagnitude}
              min={-2}
              max={20}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Brighter (-2)</span>
              <span>Fainter (20)</span>
            </div>
          </div>
        </Card>

        {/* Object List */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4 h-24 animate-pulse bg-muted" />
            ))}
          </div>
        )}

        {error && (
          <Card className="p-8 text-center">
            <p className="text-destructive">Error loading objects: {error.message}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </Card>
        )}

        {!isLoading && !error && objects.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <p>No objects found matching your filters.</p>
          </Card>
        )}

        {!isLoading && !error && objects.length > 0 && (
          <>
            <div className="space-y-3">
              {objects.map((object) => (
                <ObjectCard
                  key={object.id}
                  object={object}
                  onSelect={() => setSelectedObject(object)}
                  isSelected={selectedObject?.id === object.id}
                />
              ))}
            </div>

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
          </>
        )}
      </div>

      {/* Right Panel: Object Details */}
      <div className="lg:col-span-1">
        {selectedObject ? (
          <ObjectDetailPanel
            object={selectedObject}
            onClose={() => setSelectedObject(null)}
          />
        ) : (
          <Card className="p-8 text-center text-muted-foreground sticky top-4">
            <p>Select an object to view details</p>
          </Card>
        )}
      </div>
    </div>
  );
}
