import type { Express } from "express";
import { opsStorage } from "./ops-storage";

// Feature flag middleware
function checkOpsFeatureFlag(req: any, res: any, next: any) {
  if (process.env.ASTRO_OPS_ENABLED !== "true") {
    return res.status(404).json({
      error: "Operations & Environment features not enabled",
      hint: "Set ASTRO_OPS_ENABLED=true",
    });
  }
  next();
}

// Response wrapper
function wrapResponse(data: any, extra?: any) {
  return {
    data,
    version: "1.0.0",
    generated_at: new Date().toISOString(),
    ...extra,
  };
}

export function registerOpsRoutes(app: Express) {
  // Apply feature flag to all ops and user routes
  app.use("/astrodb/v1/ops", checkOpsFeatureFlag);
  app.use("/astrodb/v1/user", checkOpsFeatureFlag);

  // ===== SITES =====

  app.get("/astrodb/v1/ops/sites", async (req, res) => {
    try {
      const { name, lat, lon, radius_km } = req.query;

      const filters: any = {};
      if (name) filters.name = String(name);
      if (lat && lon && radius_km) {
        filters.near = {
          lat: parseFloat(String(lat)),
          lon: parseFloat(String(lon)),
          radiusKm: parseFloat(String(radius_km)),
        };
      }

      const sites = await opsStorage.getSites(filters);
      res.json(wrapResponse(sites));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/ops/sites/:id", async (req, res) => {
    try {
      const site = await opsStorage.getSiteById(req.params.id);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      res.json(wrapResponse(site));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== WEATHER/METEO =====

  app.get("/astrodb/v1/ops/weather/:site_id", async (req, res) => {
    try {
      const { from, to, max_cloud, min_transparency, max_seeing } = req.query;

      const filters: any = { siteId: req.params.site_id };
      if (from) filters.from = new Date(String(from));
      if (to) filters.to = new Date(String(to));
      if (max_cloud) filters.maxCloud = parseFloat(String(max_cloud));
      if (min_transparency) filters.minTransparency = parseFloat(String(min_transparency));
      if (max_seeing) filters.maxSeeing = parseFloat(String(max_seeing));

      const forecasts = await opsStorage.getMeteo(filters);
      res.json(wrapResponse(forecasts));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== HORIZON =====

  app.get("/astrodb/v1/ops/horizon", async (req, res) => {
    try {
      const siteId = req.query.site_id as string;
      if (!siteId) {
        return res.status(400).json({ error: "site_id query parameter required" });
      }

      // Return 360 interpolated points (0-359 degrees)
      const horizonData = await opsStorage.getHorizonInterpolated(siteId);
      res.json(wrapResponse(horizonData));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== OBSTACLES =====

  app.get("/astrodb/v1/ops/obstacles/:site_id", async (req, res) => {
    try {
      const obstacles = await opsStorage.getObstacles(req.params.site_id);
      res.json(wrapResponse(obstacles));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== DEW RISK =====

  app.get("/astrodb/v1/ops/dew/risk", async (req, res) => {
    try {
      const siteId = req.query.site_id as string;
      const tsStr = req.query.ts as string;

      if (!siteId || !tsStr) {
        return res.status(400).json({ error: "site_id and ts query parameters required" });
      }

      const ts = new Date(tsStr);
      if (isNaN(ts.getTime())) {
        return res.status(400).json({ error: "Invalid ts format (expected ISO 8601)" });
      }

      const result = await opsStorage.calculateDewRisk(siteId, ts);
      res.json(wrapResponse(result));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/ops/dew/profiles", async (req, res) => {
    try {
      const { device_key } = req.query;
      const profiles = await opsStorage.getDewProfiles(device_key ? String(device_key) : undefined);
      res.json(wrapResponse(profiles));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/ops/dew/hints", async (req, res) => {
    try {
      const { train_id } = req.query;
      const hints = await opsStorage.getDewControlHints(train_id ? String(train_id) : undefined);
      res.json(wrapResponse(hints));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== LIGHT POLLUTION =====

  app.get("/astrodb/v1/ops/lightpollution/tiles", async (req, res) => {
    try {
      const { z, x_min, x_max, y_min, y_max, dataset } = req.query;

      if (!z || !x_min || !x_max || !y_min || !y_max) {
        return res.status(400).json({ 
          error: "Required: z, x_min, x_max, y_min, y_max" 
        });
      }

      const filters = {
        z: parseInt(String(z)),
        xMin: parseInt(String(x_min)),
        xMax: parseInt(String(x_max)),
        yMin: parseInt(String(y_min)),
        yMax: parseInt(String(y_max)),
        dataset: dataset ? String(dataset) : undefined,
      };

      const tiles = await opsStorage.getLpTiles(filters);
      res.json(wrapResponse(tiles));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/ops/lightpollution/site/:site_id", async (req, res) => {
    try {
      const lpData = await opsStorage.getSiteLp(req.params.site_id);
      if (!lpData) {
        return res.status(404).json({ error: "Light pollution data not found for site" });
      }
      res.json(wrapResponse(lpData));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== LIGHT POLLUTION LOOKUP =====

  app.get("/astrodb/v1/ops/lightpollution", async (req, res) => {
    try {
      const latStr = req.query.lat as string;
      const lonStr = req.query.lon as string;

      if (!latStr || !lonStr) {
        return res.status(400).json({ error: "lat and lon query parameters required" });
      }

      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);

      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: "Invalid lat/lon values" });
      }

      const result = await opsStorage.findNearestSiteLp(lat, lon);
      if (!result) {
        return res.status(404).json({ error: "No light pollution data found" });
      }

      res.json(wrapResponse(result));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== USER SITES =====

  app.get("/astrodb/v1/user/sites", async (req, res) => {
    try {
      const sites = await opsStorage.getUserSites();
      res.json(wrapResponse(sites));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
