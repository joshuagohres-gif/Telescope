import type { Express } from "express";
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

export function registerTargetsRoutes(app: Express) {
  app.use("/astrodb/v1/targets", checkTargetsFeatureFlag);

  // ===== TRANSIENTS =====

  app.get("/astrodb/v1/targets/transients", async (req, res) => {
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

  app.get("/astrodb/v1/targets/transients/:id", async (req, res) => {
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

  app.get("/astrodb/v1/targets/notices", async (req, res) => {
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

  app.get("/astrodb/v1/targets/minorplanets", async (req, res) => {
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

  app.get("/astrodb/v1/targets/minorplanets/:id", async (req, res) => {
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

  app.get("/astrodb/v1/targets/minorplanets/:id/ephemeris", async (req, res) => {
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

  app.get("/astrodb/v1/targets/minorplanets/:id/orbit", async (req, res) => {
    try {
      const elements = await targetsStorage.getOrbitElements(parseInt(req.params.id));
      res.json(wrapResponse(elements));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== FEATURES =====

  app.get("/astrodb/v1/targets/features", async (req, res) => {
    try {
      const { body, feature_type, name, limit } = req.query;

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

  app.get("/astrodb/v1/targets/hops/:target_name", async (req, res) => {
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

  app.get("/astrodb/v1/targets/hops", async (req, res) => {
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
}
