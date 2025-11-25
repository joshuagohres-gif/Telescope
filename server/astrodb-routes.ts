import type { Express, Request, Response } from "express";
import { astroDbStorage } from "./astrodb-storage";
import { mockAstroDbStorage } from "./astrodb-storage-mock";
import { computeSatellitePasses } from "./services/satellite-passes";

// Use mock storage if no database URL is configured
const storage = process.env.DATABASE_URL ? astroDbStorage : mockAstroDbStorage;

// Feature flag check middleware
const checkFeatureFlag = (req: Request, res: Response, next: any) => {
  if (process.env.ASTRO_KB_ENABLED !== "true") {
    return res.status(404).json({ error: "Astronomical knowledge base is not enabled" });
  }
  next();
};

// Response wrapper with source attribution
function wrapResponse(data: any, sources: any[] = []) {
  return {
    data,
    sources: sources.length > 0 ? sources : [
      {
        name: "Astronomical Knowledge Base",
        license: "Various - see individual records",
      }
    ],
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
  };
}

export function registerAstroDbRoutes(app: Express) {
  // Apply feature flag check to all astrodb routes
  app.use("/astrodb", checkFeatureFlag);

  // ===== EQUIPMENT ROUTES =====

  app.get("/astrodb/v1/equipment/devices", async (req, res) => {
    try {
      const { category, interface: iface, manufacturer, q, page, pageSize } = req.query;
      
      const result = await storage.getDevices({
        category: category as string,
        interface: iface as string,
        manufacturer: manufacturer as string,
        q: q as string,
        page: page ? parseInt(page as string) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      });

      res.json({
        ...wrapResponse(result.devices),
        pagination: {
          page: parseInt(req.query.page as string || "1"),
          pageSize: parseInt(req.query.pageSize as string || "20"),
          total: result.total,
          pages: Math.ceil(result.total / parseInt(req.query.pageSize as string || "20")),
        },
      });
    } catch (error: any) {
      console.error("Error fetching devices:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/equipment/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const device = await storage.getDeviceById(id);
      
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }

      const sources = await storage.getSourcesForEntity("device", id);
      res.json(wrapResponse(device, sources));
    } catch (error: any) {
      console.error("Error fetching device:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== CATALOG ROUTES =====

  app.get("/astrodb/v1/catalog/objects", async (req, res) => {
    try {
      const { 
        class: objClass, 
        constellation, 
        mag_lte, 
        q, 
        near_ra, 
        near_dec, 
        radius_deg,
        page, 
        pageSize 
      } = req.query;

      const result = await storage.getCatalogObjects({
        class: objClass as string,
        constellation: constellation as string,
        magLte: mag_lte ? parseFloat(mag_lte as string) : undefined,
        q: q as string,
        nearRa: near_ra ? parseFloat(near_ra as string) : undefined,
        nearDec: near_dec ? parseFloat(near_dec as string) : undefined,
        radiusDeg: radius_deg ? parseFloat(radius_deg as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      });

      res.json({
        ...wrapResponse(result.objects),
        pagination: {
          page: parseInt(req.query.page as string || "1"),
          pageSize: parseInt(req.query.pageSize as string || "20"),
          total: result.total,
          pages: Math.ceil(result.total / parseInt(req.query.pageSize as string || "20")),
        },
      });
    } catch (error: any) {
      console.error("Error fetching catalog objects:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/catalog/objects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const object = await storage.getCatalogObjectById(id);
      
      if (!object) {
        return res.status(404).json({ error: "Object not found" });
      }

      const sources = await storage.getSourcesForEntity("object", id);
      res.json(wrapResponse(object, sources));
    } catch (error: any) {
      console.error("Error fetching catalog object:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== SATELLITE ROUTES =====

  app.get("/astrodb/v1/satobs/satellites", async (req, res) => {
    try {
      const { bright_first, page, pageSize } = req.query;
      
      const result = await storage.getSatellites({
        brightFirst: bright_first === "true",
        page: page ? parseInt(page as string) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      });

      res.json({
        ...wrapResponse(result.satellites),
        pagination: {
          page: parseInt(req.query.page as string || "1"),
          pageSize: parseInt(req.query.pageSize as string || "50"),
          total: result.total,
          pages: Math.ceil(result.total / parseInt(req.query.pageSize as string || "50")),
        },
      });
    } catch (error: any) {
      console.error("Error fetching satellites:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/satobs/satellites/:noradId", async (req, res) => {
    try {
      const noradId = parseInt(req.params.noradId);
      const satellite = await storage.getSatelliteByNoradId(noradId);
      
      if (!satellite) {
        return res.status(404).json({ error: "Satellite not found" });
      }

      const sources = await storage.getSourcesForEntity("satellite", noradId);
      res.json(wrapResponse(satellite, sources));
    } catch (error: any) {
      console.error("Error fetching satellite:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/satobs/passes", async (req, res) => {
    try {
      const { norad_id, lat, lon, alt_m, from, to } = req.query;

      if (!norad_id || !lat || !lon || !from || !to) {
        return res.status(400).json({ 
          error: "Missing required parameters: norad_id, lat, lon, from, to" 
        });
      }

      const noradId = parseInt(norad_id as string);
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lon as string);
      const altitude = alt_m ? parseFloat(alt_m as string) : 0;
      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);

      // Get satellite with latest TLE
      const satellite = await storage.getSatelliteByNoradId(noradId);
      if (!satellite || !satellite.latestTLE) {
        return res.status(404).json({ error: "Satellite or TLE not found" });
      }

      // Compute passes
      const passes = await computeSatellitePasses(
        satellite.latestTLE,
        latitude,
        longitude,
        altitude,
        fromDate,
        toDate
      );

      res.json(wrapResponse({ 
        satellite: {
          noradId: satellite.noradId,
          name: satellite.name,
        },
        passes,
        observer: { latitude, longitude, altitude },
        timeRange: { from: fromDate, to: toDate },
      }));
    } catch (error: any) {
      console.error("Error computing satellite passes:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== EVENTS ROUTES =====

  app.get("/astrodb/v1/events", async (req, res) => {
    try {
      const { type, from, to, country, continent, page, pageSize } = req.query;
      
      const result = await storage.getEvents({
        type: type as string,
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
        country: country as string,
        continent: continent as string,
        page: page ? parseInt(page as string) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      });

      res.json({
        ...wrapResponse(result.events),
        pagination: {
          page: parseInt(req.query.page as string || "1"),
          pageSize: parseInt(req.query.pageSize as string || "20"),
          total: result.total,
          pages: Math.ceil(result.total / parseInt(req.query.pageSize as string || "20")),
        },
      });
    } catch (error: any) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEventById(id);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const sources = await storage.getSourcesForEntity("event", id);
      res.json(wrapResponse(event, sources));
    } catch (error: any) {
      console.error("Error fetching event:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== ADMIN ROUTES (for internal use) =====

  app.get("/astrodb/v1/admin/import-runs", async (req, res) => {
    try {
      const { domain } = req.query;
      const runs = await storage.getImportRuns(domain as string);
      res.json(wrapResponse(runs));
    } catch (error: any) {
      console.error("Error fetching import runs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Health check
  app.get("/astrodb/v1/health", (req, res) => {
    res.json({ 
      status: "ok", 
      enabled: process.env.ASTRO_KB_ENABLED === "true",
      timestamp: new Date().toISOString() 
    });
  });
}
