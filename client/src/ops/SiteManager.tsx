import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, MapPin, Edit, Trash2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Site {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevM: number;
  tz: string;
  createdAt: string;
}

interface NewSite {
  name: string;
  lat: number;
  lon: number;
  elevM: number;
  tz: string;
}

export function SiteManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NewSite>({
    name: "",
    lat: 0,
    lon: 0,
    elevM: 0,
    tz: "UTC",
  });

  // Fetch sites
  const { data: sites, isLoading } = useQuery<Site[]>({
    queryKey: ["/api/ops/sites"],
    queryFn: async () => {
      const res = await fetch("/api/ops/sites");
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Operations Pack not enabled. Set ASTRO_OPS_ENABLED=true");
        }
        throw new Error("Failed to fetch sites");
      }
      const json = await res.json();
      return json.data || [];
    },
  });

  // Create site mutation
  const createSite = useMutation({
    mutationFn: async (site: NewSite) => {
      const res = await fetch("/api/ops/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(site),
      });
      if (!res.ok) throw new Error("Failed to create site");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ops/sites"] });
      setIsAdding(false);
      setFormData({ name: "", lat: 0, lon: 0, elevM: 0, tz: "UTC" });
      toast({
        title: "Site created",
        description: "Observatory site has been added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update site mutation
  const updateSite = useMutation({
    mutationFn: async ({ id, site }: { id: string; site: NewSite }) => {
      const res = await fetch(`/api/ops/sites/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(site),
      });
      if (!res.ok) throw new Error("Failed to update site");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ops/sites"] });
      setEditingId(null);
      toast({
        title: "Site updated",
        description: "Observatory site has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete site mutation
  const deleteSite = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ops/sites/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete site");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ops/sites"] });
      toast({
        title: "Site deleted",
        description: "Observatory site has been removed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateSite.mutate({ id: editingId, site: formData });
    } else {
      createSite.mutate(formData);
    }
  };

  const handleEdit = (site: Site) => {
    setEditingId(site.id);
    setFormData({
      name: site.name,
      lat: site.lat,
      lon: site.lon,
      elevM: site.elevM,
      tz: site.tz,
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: "", lat: 0, lon: 0, elevM: 0, tz: "UTC" });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading sites...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Observatory Sites
          </CardTitle>
          <CardDescription>
            Manage observatory locations for weather, horizon, and light pollution data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add/Edit Form */}
          {isAdding && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Site Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Backyard Observatory"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lat">Latitude (°)</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="0.000001"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                    placeholder="34.0522"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lon">Longitude (°)</Label>
                  <Input
                    id="lon"
                    type="number"
                    step="0.000001"
                    value={formData.lon}
                    onChange={(e) => setFormData({ ...formData, lon: parseFloat(e.target.value) })}
                    placeholder="-118.2437"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="elevM">Elevation (m)</Label>
                  <Input
                    id="elevM"
                    type="number"
                    value={formData.elevM}
                    onChange={(e) => setFormData({ ...formData, elevM: parseFloat(e.target.value) })}
                    placeholder="100"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tz">Timezone</Label>
                  <Input
                    id="tz"
                    value={formData.tz}
                    onChange={(e) => setFormData({ ...formData, tz: e.target.value })}
                    placeholder="America/Los_Angeles"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createSite.isPending || updateSite.isPending}>
                  <Check className="w-4 h-4 mr-2" />
                  {editingId ? "Update" : "Create"} Site
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Add Button */}
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add New Site
            </Button>
          )}

          {/* Sites List */}
          <div className="space-y-2">
            {sites && sites.length > 0 ? (
              sites.map((site) => (
                <div
                  key={site.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{site.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {site.lat.toFixed(4)}°, {site.lon.toFixed(4)}° • {site.elevM}m • {site.tz}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(site)}
                      disabled={isAdding}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSite.mutate(site.id)}
                      disabled={deleteSite.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No sites configured. Add your first observatory site to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
