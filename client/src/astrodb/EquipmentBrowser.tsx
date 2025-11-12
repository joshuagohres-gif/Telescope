import { useState } from "react";
import { useDevices, type Device } from "@/hooks/use-astrodb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, GitCompare } from "lucide-react";
import { DeviceCard } from "./DeviceCard";
import { DeviceDetailModal } from "./DeviceDetailModal";
import { ComparisonView } from "./ComparisonView";

export function EquipmentBrowser() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [manufacturer, setManufacturer] = useState<string>("");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [comparisonDevices, setComparisonDevices] = useState<Device[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const { data, isLoading, error } = useDevices({
    category: category || undefined,
    manufacturer: manufacturer || undefined,
    q: searchQuery || undefined,
    page,
    pageSize,
  });

  const devices = data?.data || [];
  const pagination = data?.pagination;

  const toggleComparison = (device: Device) => {
    setComparisonDevices((prev) => {
      const exists = prev.find((d) => d.id === device.id);
      if (exists) {
        return prev.filter((d) => d.id !== device.id);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), device];
      }
      return [...prev, device];
    });
  };

  const isInComparison = (deviceId: number) => {
    return comparisonDevices.some((d) => d.id === deviceId);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>

        <div className="space-y-1">
          <Select value={category || undefined} onValueChange={(value) => { setCategory(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Telescope">Telescope</SelectItem>
              <SelectItem value="Camera">Camera</SelectItem>
              <SelectItem value="Mount">Mount</SelectItem>
              <SelectItem value="Focuser">Focuser</SelectItem>
              <SelectItem value="Filter Wheel">Filter Wheel</SelectItem>
              <SelectItem value="Guider">Guider</SelectItem>
            </SelectContent>
          </Select>
          {category && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setCategory("")}>
              Clear filter
            </Button>
          )}
        </div>

        <div className="space-y-1">
          <Select value={manufacturer || undefined} onValueChange={(value) => { setManufacturer(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="All Manufacturers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Celestron">Celestron</SelectItem>
              <SelectItem value="ZWO">ZWO</SelectItem>
              <SelectItem value="Sky-Watcher">Sky-Watcher</SelectItem>
              <SelectItem value="Takahashi">Takahashi</SelectItem>
              <SelectItem value="QHYCCD">QHYCCD</SelectItem>
              <SelectItem value="Explore Scientific">Explore Scientific</SelectItem>
            </SelectContent>
          </Select>
          {manufacturer && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setManufacturer("")}>
              Clear filter
            </Button>
          )}
        </div>
      </div>

      {/* Comparison Bar */}
      {comparisonDevices.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-primary" />
              <span className="font-medium">
                {comparisonDevices.length} device{comparisonDevices.length !== 1 ? "s" : ""} selected for comparison
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setComparisonDevices([])}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() => setShowComparison(true)}
                disabled={comparisonDevices.length < 2}
              >
                Compare ({comparisonDevices.length})
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Device Grid */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 h-64 animate-pulse bg-muted" />
          ))}
        </div>
      )}

      {error && (
        <Card className="p-8 text-center">
          <p className="text-destructive">Error loading devices: {error.message}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Card>
      )}

      {!isLoading && !error && devices.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <p>No devices found matching your filters.</p>
        </Card>
      )}

      {!isLoading && !error && devices.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onViewDetails={() => setSelectedDevice(device)}
                onToggleComparison={() => toggleComparison(device)}
                isInComparison={isInComparison(device.id)}
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

      {/* Device Detail Modal */}
      {selectedDevice && (
        <DeviceDetailModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
        />
      )}

      {/* Comparison View */}
      {showComparison && (
        <ComparisonView
          devices={comparisonDevices}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
}
