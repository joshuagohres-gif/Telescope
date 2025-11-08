import type { Express } from "express";
import express from "express";
import { targetsStorage } from "./targets-storage";

// Feature flag middleware
function checkTargetsFeatureFlag(req: any, res: any, next: any) {
  if (process.env.ASTRO_TARGETS_ENABLED !== "true") {
    return res.status(404).json({
      error: "Targeting & Alerts features not enabled",
      hint: "Set ASTRO_TARGETS_ENABLED=true",
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

export function createTargetsRouter(): express.Router {
  const router = express.Router();
  
  // Apply feature flag middleware
  router.use(checkTargetsFeatureFlag);

  // ===== TRANSIENTS =====

  router.get("/targets/transients", async (req, res) => {
    try {
      const { type, name, min_mag, max_mag, since, limit } = req.query;

      const filters: any = {};
      if (type) filters.type = String(type);
      if (name) filters.name = String(name);
      if (min_mag) filters.minMag = parseFloat(String(min_mag));
      if (max_mag) filters.maxMag = parseFloat(String(max_mag));
      if (since) filters.since = new Date(String(since));
      if (limit) filters.limit = parseInt(String(limit));

      const transients = await targetsStorage.getTransients(filters);
      res.json(wrapResponse(transients));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/targets/transients/:id", async (req, res) => {
    try {
      const transient = await targetsStorage.getTransientById(parseInt(req.params.id));
      if (!transient) {
        return res.status(404).json({ error: "Transient not found" });
      }
      res.json(wrapResponse(transient));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== NOTICES =====

  router.get("/targets/notices", async (req, res) => {
    try {
      const { transient_id, source, since, limit } = req.query;

      const filters: any = {};
      if (transient_id) filters.transientId = parseInt(String(transient_id));
      if (source) filters.source = String(source);
      if (since) filters.since = new Date(String(since));
      if (limit) filters.limit = parseInt(String(limit));

      const notices = await targetsStorage.getNotices(filters);
      res.json(wrapResponse(notices));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== MINOR PLANETS =====

  router.get("/targets/minorplanets", async (req, res) => {
    try {
      const { designation, name, body_type, limit } = req.query;

      const filters: any = {};
      if (designation) filters.designation = String(designation);
      if (name) filters.name = String(name);
      if (body_type) filters.bodyType = String(body_type);
      if (limit) filters.limit = parseInt(String(limit));

      const bodies = await targetsStorage.getMpBodies(filters);
      res.json(wrapResponse(bodies));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/targets/minorplanets/:id", async (req, res) => {
    try {
      const body = await targetsStorage.getMpBodyById(parseInt(req.params.id));
      if (!body) {
        return res.status(404).json({ error: "Minor planet not found" });
      }
      res.json(wrapResponse(body));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/targets/minorplanets/:id/ephemeris", async (req, res) => {
    try {
      const { from, to } = req.query;

      const filters: any = {
        bodyId: parseInt(req.params.id),
      };
      if (from) filters.from = new Date(String(from));
      if (to) filters.to = new Date(String(to));

      const ephemeris = await targetsStorage.getEphemeris(filters);
      res.json(wrapResponse(ephemeris));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/targets/minorplanets/:id/orbit", async (req, res) => {
    try {
      const elements = await targetsStorage.getOrbitElements(parseInt(req.params.id));
      res.json(wrapResponse(elements));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== FEATURES =====

  router.get("/targets/features", async (req, res) => {
    try {
      const { body, feature_type, name, limit, near, radius_km } = req.query;

      // Radius search
      if (near && radius_km) {
        const nearParts = String(near).split(",");
        if (nearParts.length !== 2) {
          return res.status(400).json({ error: "near parameter must be 'lat,lon'" });
        }
        const lat = parseFloat(nearParts[0]);
        const lon = parseFloat(nearParts[1]);
        const radius = parseFloat(String(radius_km));

        if (isNaN(lat) || isNaN(lon) || isNaN(radius)) {
          return res.status(400).json({ error: "Invalid lat, lon, or radius_km values" });
        }

        const bodyFilter = body ? String(body) : "Moon";
        const features = await targetsStorage.getFeaturesNear(bodyFilter, lat, lon, radius);
        res.json(wrapResponse(features));
        return;
      }

      // Regular filter search
      const filters: any = {};
      if (body) filters.body = String(body);
      if (feature_type) filters.featureType = String(feature_type);
      if (name) filters.name = String(name);
      if (limit) filters.limit = parseInt(String(limit));

      const features = await targetsStorage.getFeatures(filters);
      res.json(wrapResponse(features));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== STAR HOPS =====

  router.get("/targets/hops/:target_name", async (req, res) => {
    try {
      const hops = await targetsStorage.getStarHops(req.params.target_name);
      if (hops.length === 0) {
        return res.status(404).json({ error: "No star hop found for target" });
      }
      res.json(wrapResponse(hops));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/targets/hops", async (req, res) => {
    try {
      const { q, limit } = req.query;
      if (!q) {
        return res.status(400).json({ error: "Query parameter 'q' required" });
      }

      const results = await targetsStorage.searchStarHops(
        String(q),
        limit ? parseInt(String(limit)) : 50
      );
      res.json(wrapResponse(results));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== TONIGHT'S SHOWPIECES =====

  router.get("/targets/tonight", async (req, res) => {
    try {
      const latStr = req.query.lat as string;
      const lonStr = req.query.lon as string;
      const fromStr = req.query.from as string;
      const toStr = req.query.to as string;
      const stepStr = req.query.step as string;

      if (!latStr || !lonStr || !fromStr || !toStr) {
        return res.status(400).json({
          error: "Required parameters: lat, lon, from, to",
        });
      }

      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      const from = new Date(fromStr);
      const to = new Date(toStr);

      if (isNaN(lat) || isNaN(lon) || isNaN(from.getTime()) || isNaN(to.getTime())) {
        return res.status(400).json({ error: "Invalid parameter values" });
      }

      // Parse step (e.g., "60m" -> 60 minutes)
      let stepMinutes = 60;
      if (stepStr) {
        const match = stepStr.match(/^(\d+)([mh])$/);
        if (match) {
          const value = parseInt(match[1]);
          const unit = match[2];
          stepMinutes = unit === "h" ? value * 60 : value;
        }
      }

      const showpieces = await targetsStorage.getShowpiecesTonight(
        lat,
        lon,
        from,
        to,
        stepMinutes
      );

      res.json(wrapResponse(showpieces));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== SATELLITE PASSES =====

  router.get("/targets/passes", async (req, res) => {
    try {
      const noradIdStr = req.query.norad_id as string;
      const latStr = req.query.lat as string;
      const lonStr = req.query.lon as string;
      const altMStr = req.query.alt_m as string;
      const fromStr = req.query.from as string;
      const toStr = req.query.to as string;

      if (!noradIdStr || !latStr || !lonStr || !fromStr || !toStr) {
        return res.status(400).json({
          error: "Required parameters: norad_id, lat, lon, from, to",
        });
      }

      const noradId = parseInt(noradIdStr);
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      const altM = altMStr ? parseFloat(altMStr) : 0;
      const from = new Date(fromStr);
      const to = new Date(toStr);

      if (
        isNaN(noradId) ||
        isNaN(lat) ||
        isNaN(lon) ||
        isNaN(from.getTime()) ||
        isNaN(to.getTime())
      ) {
        return res.status(400).json({ error: "Invalid parameter values" });
      }

      const passes = await targetsStorage.getSatellitePasses(
        noradId,
        lat,
        lon,
        altM,
        from,
        to
      );

      res.json(wrapResponse(passes));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

// Legacy export for backward compatibility
export function registerTargetsRoutes(app: Express) {
  const router = createTargetsRouter();
  app.use("/astrodb/v1", router);
}
