// Mock in-memory AstroDB storage for development/testing without a database
import type {
  DeviceWithDetails,
  CatalogObjectWithAka,
  SatelliteWithTLE,
  EventWithVisibility,
} from "./astrodb-storage";

// Mock data based on seed file
const mockManufacturers = [
  { id: 1, name: "ZWO", website: "https://www.zwoastro.com", country: "China" },
  { id: 2, name: "Celestron", website: "https://www.celestron.com", country: "USA" },
  { id: 3, name: "Sky-Watcher", website: "https://www.skywatcher.com", country: "China" },
  { id: 4, name: "QHY", website: "https://www.qhyccd.com", country: "China" },
  { id: 5, name: "Planewave", website: "https://planewave.com", country: "USA" },
  { id: 6, name: "Software Bisque", website: "https://www.bisque.com", country: "USA" },
  { id: 7, name: "Takahashi", website: "https://www.takahashijapan.com", country: "Japan" },
];

const mockDevices: DeviceWithDetails[] = [
  // Telescopes
  {
    id: 1,
    manufacturerId: 2,
    model: "EdgeHD 11",
    category: "Telescope",
    interface: "Other",
    apertureMm: 280,
    focalLengthMm: 2800,
    focalRatio: 10,
    backfocusMm: 146,
    imageCircleMm: 52,
    manufacturer: "Celestron",
    specUrl: null,
    imageUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    manufacturerId: 7,
    model: "FSQ-106EDX4",
    category: "Telescope",
    interface: "Other",
    apertureMm: 106,
    focalLengthMm: 530,
    focalRatio: 5,
    backfocusMm: 93,
    imageCircleMm: 60,
    manufacturer: "Takahashi",
    specUrl: null,
    imageUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Cameras
  {
    id: 3,
    manufacturerId: 1,
    model: "ASI294MC Pro",
    category: "Camera",
    interface: "ASCOM",
    sensorWidthMm: 19.1,
    sensorHeightMm: 13.0,
    pixelSizeUm: 4.63,
    backfocusMm: 17.5,
    manufacturer: "ZWO",
    apertureMm: null,
    focalLengthMm: null,
    focalRatio: null,
    imageCircleMm: null,
    specUrl: null,
    imageUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 4,
    manufacturerId: 1,
    model: "ASI2600MM Pro",
    category: "Camera",
    interface: "ASCOM",
    sensorWidthMm: 23.5,
    sensorHeightMm: 15.7,
    pixelSizeUm: 3.76,
    backfocusMm: 17.5,
    manufacturer: "ZWO",
    apertureMm: null,
    focalLengthMm: null,
    focalRatio: null,
    imageCircleMm: null,
    specUrl: null,
    imageUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 5,
    manufacturerId: 4,
    model: "QHY268M",
    category: "Camera",
    interface: "ASCOM",
    sensorWidthMm: 23.5,
    sensorHeightMm: 15.7,
    pixelSizeUm: 3.76,
    backfocusMm: 20,
    manufacturer: "QHY",
    apertureMm: null,
    focalLengthMm: null,
    focalRatio: null,
    imageCircleMm: null,
    specUrl: null,
    imageUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Mounts
  {
    id: 6,
    manufacturerId: 2,
    model: "CGEM II",
    category: "Mount",
    interface: "ASCOM",
    manufacturer: "Celestron",
    apertureMm: null,
    focalLengthMm: null,
    focalRatio: null,
    backfocusMm: null,
    imageCircleMm: null,
    sensorWidthMm: null,
    sensorHeightMm: null,
    pixelSizeUm: null,
    specUrl: null,
    imageUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 7,
    manufacturerId: 3,
    model: "EQ6-R Pro",
    category: "Mount",
    interface: "ASCOM",
    manufacturer: "Sky-Watcher",
    apertureMm: null,
    focalLengthMm: null,
    focalRatio: null,
    backfocusMm: null,
    imageCircleMm: null,
    sensorWidthMm: null,
    sensorHeightMm: null,
    pixelSizeUm: null,
    specUrl: null,
    imageUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 8,
    manufacturerId: 6,
    model: "Paramount MX+",
    category: "Mount",
    interface: "ASCOM",
    manufacturer: "Software Bisque",
    apertureMm: null,
    focalLengthMm: null,
    focalRatio: null,
    backfocusMm: null,
    imageCircleMm: null,
    sensorWidthMm: null,
    sensorHeightMm: null,
    pixelSizeUm: null,
    specUrl: null,
    imageUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Focuser
  {
    id: 9,
    manufacturerId: 5,
    model: "Hedrick Focuser",
    category: "Focuser",
    interface: "ASCOM",
    manufacturer: "Planewave",
    apertureMm: null,
    focalLengthMm: null,
    focalRatio: null,
    backfocusMm: null,
    imageCircleMm: null,
    sensorWidthMm: null,
    sensorHeightMm: null,
    pixelSizeUm: null,
    specUrl: null,
    imageUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockCatalogObjects: any[] = [
  {
    id: 1,
    names: ["M31", "Andromeda Galaxy", "NGC 224"],
    class: "galaxy",
    constellation: "Andromeda",
    ra: 10.6847,
    dec: 41.2687,
    magnitude: 3.4,
    surfaceBrightness: 13.5,
    sizeArcmin: 178.0,
    distance: "2.5 million light-years",
    notes: "Andromeda Galaxy - nearest major galaxy",
  },
  {
    id: 2,
    names: ["M42", "Orion Nebula", "NGC 1976"],
    class: "nebula",
    constellation: "Orion",
    ra: 83.8221,
    dec: -5.3911,
    magnitude: 4.0,
    surfaceBrightness: null,
    sizeArcmin: 85.0,
    distance: "1,344 light-years",
    notes: "Orion Nebula - stellar nursery visible to naked eye",
  },
  {
    id: 3,
    names: ["M13", "Hercules Globular Cluster", "NGC 6205"],
    class: "globular cluster",
    constellation: "Hercules",
    ra: 250.4234,
    dec: 36.4601,
    magnitude: 5.8,
    surfaceBrightness: null,
    sizeArcmin: 20.0,
    distance: "22,200 light-years",
    notes: "Great Globular Cluster in Hercules",
  },
  {
    id: 4,
    names: ["M45", "Pleiades", "Seven Sisters"],
    class: "open cluster",
    constellation: "Taurus",
    ra: 56.75,
    dec: 24.1167,
    magnitude: 1.6,
    surfaceBrightness: null,
    sizeArcmin: 110.0,
    distance: "444 light-years",
    notes: "Seven Sisters - famous open cluster",
  },
  {
    id: 5,
    names: ["M51", "Whirlpool Galaxy", "NGC 5194"],
    class: "galaxy",
    constellation: "Canes Venatici",
    ra: 202.4696,
    dec: 47.1952,
    magnitude: 8.4,
    surfaceBrightness: 13.0,
    sizeArcmin: 11.2,
    distance: "23 million light-years",
    notes: "Whirlpool Galaxy - spiral galaxy with companion",
  },
];

const mockSatellites: SatelliteWithTLE[] = [
  {
    id: 1,
    noradId: 25544,
    name: "ISS (ZARYA)",
    commonName: "International Space Station",
    category: "Space Station",
    avgMag: -3.5,
    latestTLE: {
      id: 1,
      satelliteId: 1,
      line1: "1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005",
      line2: "2 25544  51.6416  80.0000 0001234  90.0000 270.0000 15.50000000000009",
      epoch: new Date(),
      createdAt: new Date(),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    noradId: 20580,
    name: "HST",
    commonName: "Hubble Space Telescope",
    category: "Space Telescope",
    avgMag: 2.5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockEvents: EventWithVisibility[] = [
  {
    id: 1,
    name: "Total Lunar Eclipse",
    type: "Lunar Eclipse",
    eventTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours duration
    description: "Total lunar eclipse visible from North America",
    country: "USA",
    continent: "North America",
    notes: "Best viewing from western states",
    tags: ["eclipse", "total"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: "Geminids Meteor Shower Peak",
    type: "Meteor Shower",
    eventTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    description: "Peak of the Geminids meteor shower - up to 120 meteors per hour",
    notes: "Best viewing after midnight",
    tags: ["meteor shower", "geminids"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    name: "Mars Opposition",
    type: "Opposition",
    eventTime: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    description: "Mars at opposition - closest approach to Earth",
    notes: "Best time for Mars observation",
    tags: ["mars", "opposition"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export class MockAstroDbStorage {
  async getDevices(filters: {
    category?: string;
    interface?: string;
    manufacturer?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ devices: DeviceWithDetails[]; total: number }> {
    let filtered = [...mockDevices];

    // Apply filters
    if (filters.category) {
      filtered = filtered.filter(d => d.category === filters.category);
    }
    if (filters.interface) {
      filtered = filtered.filter(d => d.interface === filters.interface);
    }
    if (filters.manufacturer) {
      const mfr = mockManufacturers.find(m => m.name === filters.manufacturer);
      if (mfr) {
        filtered = filtered.filter(d => d.manufacturerId === mfr.id);
      }
    }
    if (filters.q) {
      const query = filters.q.toLowerCase();
      filtered = filtered.filter(d =>
        d.model.toLowerCase().includes(query) ||
        d.manufacturer?.toLowerCase().includes(query)
      );
    }

    // Pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      devices: filtered.slice(start, end),
      total: filtered.length,
    };
  }

  async getDeviceById(id: number): Promise<DeviceWithDetails | null> {
    return mockDevices.find(d => d.id === id) || null;
  }

  async getCatalogObjects(filters: {
    class?: string;
    constellation?: string;
    magLte?: number;
    q?: string;
    nearRa?: number;
    nearDec?: number;
    radiusDeg?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ objects: CatalogObjectWithAka[]; total: number }> {
    let filtered = [...mockCatalogObjects];

    // Apply filters
    if (filters.class) {
      filtered = filtered.filter(o => o.class === filters.class);
    }
    if (filters.constellation) {
      filtered = filtered.filter(o => o.constellation === filters.constellation);
    }
    if (filters.magLte !== undefined) {
      filtered = filtered.filter(o => o.mag && o.mag <= filters.magLte!);
    }
    if (filters.q) {
      const query = filters.q.toLowerCase();
      filtered = filtered.filter(o =>
        o.primaryName.toLowerCase().includes(query) ||
        o.alternateNames?.some(n => n.toLowerCase().includes(query)) ||
        Object.values(o.catalogIds).some(v => v?.toLowerCase().includes(query))
      );
    }

    // Pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      objects: filtered.slice(start, end),
      total: filtered.length,
    };
  }

  async getCatalogObjectById(id: number): Promise<CatalogObjectWithAka | null> {
    return mockCatalogObjects.find(o => o.id === id) || null;
  }

  async getSatellites(filters: {
    category?: string;
    brightFirst?: boolean;
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ satellites: SatelliteWithTLE[]; total: number }> {
    let filtered = [...mockSatellites];

    // Apply filters
    if (filters.category) {
      filtered = filtered.filter(s => s.category === filters.category);
    }
    if (filters.q) {
      const query = filters.q.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.commonName?.toLowerCase().includes(query)
      );
    }

    // Sort by brightness if requested
    if (filters.brightFirst) {
      filtered.sort((a, b) => (a.avgMag || 99) - (b.avgMag || 99));
    }

    // Pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      satellites: filtered.slice(start, end),
      total: filtered.length,
    };
  }

  async getSatelliteByNoradId(noradId: number): Promise<SatelliteWithTLE | null> {
    return mockSatellites.find(s => s.noradId === noradId) || null;
  }

  async getEvents(filters: {
    type?: string;
    from?: Date;
    to?: Date;
    country?: string;
    continent?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ events: EventWithVisibility[]; total: number }> {
    let filtered = [...mockEvents];

    // Apply filters
    if (filters.type) {
      filtered = filtered.filter(e => e.type === filters.type);
    }
    if (filters.from) {
      filtered = filtered.filter(e => e.eventTime >= filters.from!);
    }
    if (filters.to) {
      filtered = filtered.filter(e => e.eventTime <= filters.to!);
    }
    if (filters.country) {
      filtered = filtered.filter(e => e.country === filters.country);
    }
    if (filters.continent) {
      filtered = filtered.filter(e => e.continent === filters.continent);
    }

    // Sort by event time
    filtered.sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());

    // Pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      events: filtered.slice(start, end),
      total: filtered.length,
    };
  }

  async getEventById(id: number): Promise<EventWithVisibility | null> {
    return mockEvents.find(e => e.id === id) || null;
  }

  async getSourcesForEntity(entityType: string, entityId: number): Promise<any[]> {
    return [{
      sourceName: "Mock Data Source",
      sourceUrl: "https://example.com",
      license: "Public Domain",
    }];
  }

  async getImportRuns(domain?: string): Promise<any[]> {
    return [{
      id: 1,
      domain: domain || "equipment",
      status: "completed",
      recordsImported: mockDevices.length + mockCatalogObjects.length + mockSatellites.length,
      startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
    }];
  }
}

export const mockAstroDbStorage = new MockAstroDbStorage();
