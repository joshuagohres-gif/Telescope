import { useQuery } from "@tanstack/react-query";

// ===== TYPES =====

export interface Device {
  id: number;
  category: string;
  manufacturer: string | null;
  model: string;
  interface: string | null;
  apertureMm: number | null;
  focalLengthMm: number | null;
  focalRatio: number | null;
  backfocusMm: number | null;
  imageCircleMm: number | null;
  sensorWidthMm: number | null;
  sensorHeightMm: number | null;
  pixelSizeUm: number | null;
  specUrl: string | null;
  imageUrl: string | null;
  notes: string | null;
}

export interface CatalogObject {
  id: number;
  names: string[];
  class: string;
  constellation: string | null;
  ra: number;
  dec: number;
  magnitude: number | null;
  surfaceBrightness: number | null;
  sizeArcmin: number | null;
  distance: string | null;
  notes: string | null;
}

export interface Satellite {
  noradId: number;
  name: string;
  intlDesignator: string | null;
  objectType: string | null;
  rcsSize: string | null;
  launchDate: string | null;
  decayDate: string | null;
  latestTLE: {
    epoch: string;
    line1: string;
    line2: string;
  } | null;
}

export interface SatellitePass {
  riseTime: string;
  riseAz: number;
  maxTime: string;
  maxAlt: number;
  maxAz: number;
  maxMag: number | null;
  setTime: string;
  setAz: number;
  durationSec: number;
}

export interface AstronomicalEvent {
  id: number;
  type: string;
  name: string;
  description: string | null;
  eventTime: string;
  endTime: string | null;
  continent: string | null;
  country: string | null;
  notes: string | null;
}

// ===== EQUIPMENT HOOKS =====

export function useDevices(filters?: {
  category?: string;
  manufacturer?: string;
  interface?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.category) params.append("category", filters.category);
  if (filters?.manufacturer) params.append("manufacturer", filters.manufacturer);
  if (filters?.interface) params.append("interface", filters.interface);
  if (filters?.q) params.append("q", filters.q);
  if (filters?.page) params.append("page", filters.page.toString());
  if (filters?.pageSize) params.append("pageSize", filters.pageSize.toString());

  return useQuery<{ data: Device[]; pagination: any }>({
    queryKey: ["/astrodb/v1/equipment/devices", filters],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/equipment/devices?${params}`);
      if (!response.ok) throw new Error("Failed to fetch devices");
      return response.json();
    },
    enabled: true,
  });
}

export function useDevice(id: number | null) {
  return useQuery<{ data: Device; sources: any[] }>({
    queryKey: ["/astrodb/v1/equipment/devices", id],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/equipment/devices/${id}`);
      if (!response.ok) throw new Error("Failed to fetch device");
      return response.json();
    },
    enabled: !!id,
  });
}

// ===== CATALOG HOOKS =====

export function useCatalogObjects(filters?: {
  class?: string;
  constellation?: string;
  magLte?: number;
  q?: string;
  nearRa?: number;
  nearDec?: number;
  radiusDeg?: number;
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.class) params.append("class", filters.class);
  if (filters?.constellation) params.append("constellation", filters.constellation);
  if (filters?.magLte !== undefined) params.append("mag_lte", filters.magLte.toString());
  if (filters?.q) params.append("q", filters.q);
  if (filters?.nearRa !== undefined) params.append("near_ra", filters.nearRa.toString());
  if (filters?.nearDec !== undefined) params.append("near_dec", filters.nearDec.toString());
  if (filters?.radiusDeg !== undefined) params.append("radius_deg", filters.radiusDeg.toString());
  if (filters?.page) params.append("page", filters.page.toString());
  if (filters?.pageSize) params.append("pageSize", filters.pageSize.toString());

  return useQuery<{ data: CatalogObject[]; pagination: any }>({
    queryKey: ["/astrodb/v1/catalog/objects", filters],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/catalog/objects?${params}`);
      if (!response.ok) throw new Error("Failed to fetch catalog objects");
      return response.json();
    },
    enabled: true,
  });
}

export function useCatalogObject(id: number | null) {
  return useQuery<{ data: CatalogObject; sources: any[] }>({
    queryKey: ["/astrodb/v1/catalog/objects", id],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/catalog/objects/${id}`);
      if (!response.ok) throw new Error("Failed to fetch catalog object");
      return response.json();
    },
    enabled: !!id,
  });
}

// ===== SATELLITE HOOKS =====

export function useSatellites(filters?: {
  brightFirst?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.brightFirst) params.append("bright_first", "true");
  if (filters?.page) params.append("page", filters.page.toString());
  if (filters?.pageSize) params.append("pageSize", filters.pageSize.toString());

  return useQuery<{ data: Satellite[]; pagination: any }>({
    queryKey: ["/astrodb/v1/satobs/satellites", filters],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/satobs/satellites?${params}`);
      if (!response.ok) throw new Error("Failed to fetch satellites");
      return response.json();
    },
    enabled: true,
  });
}

export function useSatellite(noradId: number | null) {
  return useQuery<{ data: Satellite; sources: any[] }>({
    queryKey: ["/astrodb/v1/satobs/satellites", noradId],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/satobs/satellites/${noradId}`);
      if (!response.ok) throw new Error("Failed to fetch satellite");
      return response.json();
    },
    enabled: !!noradId,
  });
}

export function useSatellitePasses(params: {
  noradId: number;
  lat: number;
  lon: number;
  altM?: number;
  from: Date;
  to: Date;
} | null) {
  const queryParams = new URLSearchParams();
  if (params) {
    queryParams.append("norad_id", params.noradId.toString());
    queryParams.append("lat", params.lat.toString());
    queryParams.append("lon", params.lon.toString());
    if (params.altM !== undefined) queryParams.append("alt_m", params.altM.toString());
    queryParams.append("from", params.from.toISOString());
    queryParams.append("to", params.to.toISOString());
  }

  return useQuery<{ data: { satellite: any; passes: SatellitePass[]; observer: any; timeRange: any } }>({
    queryKey: ["/astrodb/v1/satobs/passes", params],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/satobs/passes?${queryParams}`);
      if (!response.ok) throw new Error("Failed to fetch satellite passes");
      return response.json();
    },
    enabled: !!params,
  });
}

// ===== EVENTS HOOKS =====

export function useAstronomicalEvents(filters?: {
  type?: string;
  from?: Date;
  to?: Date;
  country?: string;
  continent?: string;
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.type) params.append("type", filters.type);
  if (filters?.from) params.append("from", filters.from.toISOString());
  if (filters?.to) params.append("to", filters.to.toISOString());
  if (filters?.country) params.append("country", filters.country);
  if (filters?.continent) params.append("continent", filters.continent);
  if (filters?.page) params.append("page", filters.page.toString());
  if (filters?.pageSize) params.append("pageSize", filters.pageSize.toString());

  return useQuery<{ data: AstronomicalEvent[]; pagination: any }>({
    queryKey: ["/astrodb/v1/events", filters],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/events?${params}`);
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
    enabled: true,
  });
}

export function useAstronomicalEvent(id: number | null) {
  return useQuery<{ data: AstronomicalEvent; sources: any[] }>({
    queryKey: ["/astrodb/v1/events", id],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/events/${id}`);
      if (!response.ok) throw new Error("Failed to fetch event");
      return response.json();
    },
    enabled: !!id,
  });
}
