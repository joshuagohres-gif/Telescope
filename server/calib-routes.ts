import type { Express } from "express";
import express from "express";
import { calibStorage } from "./calib-storage";

// Feature flag middleware
function checkCalibFeatureFlag(req: any, res: any, next: any) {
  if (process.env.ASTRO_CALIB_ENABLED !== "true") {
    return res.status(404).json({
      error: "Equipment & Calibration features not enabled",
      hint: "Set ASTRO_CALIB_ENABLED=true",
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

export function createCalibRouter(): express.Router {
  const router = express.Router();
  
  // Apply feature flag middleware
  router.use(checkCalibFeatureFlag);

  // ===== OPTICAL TRAINS =====

  router.get("/calib/trains", async (req, res) => {
    try {
      const { name } = req.query;
      const trains = await calibStorage.getOpticalTrains({ name: name ? String(name) : undefined });
      res.json(wrapResponse(trains));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/calib/trains/:id", async (req, res) => {
    try {
      const train = await calibStorage.getOpticalTrainById(req.params.id);
      if (!train) {
        return res.status(404).json({ error: "Optical train not found" });
      }
      res.json(wrapResponse(train));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== MASTER FRAMES =====

  router.get("/calib/masters", async (req, res) => {
    try {
      const { train_id, kind, frame_type, filter, filter_name, temp_c, gain, exp_s, binning, limit } = req.query;

      // If scoring parameters provided, find best match
      if (train_id && kind && (temp_c || gain || exp_s)) {
        const result = await calibStorage.findBestMasterFrame({
          trainId: String(train_id),
          kind: String(kind) as any,
          filter: filter ? String(filter) : filter_name ? String(filter_name) : undefined,
          tempC: temp_c ? parseFloat(String(temp_c)) : undefined,
          gain: gain ? String(gain) : undefined,
          expS: exp_s ? parseFloat(String(exp_s)) : undefined,
        });

        if (!result) {
          return res.status(404).json({ error: "No matching master frame found" });
        }

        return res.json(wrapResponse(result));
      }

      // Otherwise, return list of frames
      const filters: any = {};
      if (train_id) filters.trainId = String(train_id);
      if (kind) filters.kind = String(kind);
      if (frame_type) filters.frameType = String(frame_type);
      if (filter) filters.filter = String(filter);
      if (filter_name) filters.filterName = String(filter_name);
      if (binning) filters.binning = String(binning);
      if (limit) filters.limit = parseInt(String(limit));

      const frames = await calibStorage.getMasterFrames(filters);
      res.json(wrapResponse(frames));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== FOCUS =====

  router.get("/calib/focus/samples", async (req, res) => {
    try {
      const { train_id, session_id, from, to, limit } = req.query;

      const filters: any = {};
      if (train_id) filters.trainId = String(train_id);
      if (session_id) filters.sessionId = String(session_id);
      if (from) filters.from = new Date(String(from));
      if (to) filters.to = new Date(String(to));
      if (limit) filters.limit = parseInt(String(limit));

      const samples = await calibStorage.getFocusSamples(filters);
      res.json(wrapResponse(samples));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/calib/focus/profiles", async (req, res) => {
    try {
      const { train_id, filter_name } = req.query;

      const filters: any = {};
      if (train_id) filters.trainId = String(train_id);
      if (filter_name) filters.filterName = String(filter_name);

      const profiles = await calibStorage.getFocusProfiles(filters);
      res.json(wrapResponse(profiles));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/calib/focus/estimate/:train_id", async (req, res) => {
    try {
      const { filter_name, filter, temp_c } = req.query;

      const filterName = filter ? String(filter) : filter_name ? String(filter_name) : null;
      const tempC = temp_c ? parseFloat(String(temp_c)) : null;

      if (!filterName || tempC === null) {
        return res.status(400).json({ error: "Required: filter (or filter_name), temp_c" });
      }

      const estimate = await calibStorage.estimateFocus(
        req.params.train_id,
        filterName,
        tempC
      );

      if (!estimate) {
        return res.status(404).json({ error: "No focus profile found for this train/filter" });
      }

      res.json(wrapResponse(estimate));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== EQUIPMENT FOCUS ESTIMATE (Alternative endpoint) =====

  router.get("/equip/focus/estimate", async (req, res) => {
    try {
      const { train_id, filter, temp_c } = req.query;

      if (!train_id || !filter || !temp_c) {
        return res.status(400).json({ error: "Required: train_id, filter, temp_c" });
      }

      const estimate = await calibStorage.estimateFocus(
        String(train_id),
        String(filter),
        parseFloat(String(temp_c))
      );

      if (!estimate) {
        return res.status(404).json({ error: "No focus profile found for this train/filter" });
      }

      res.json(wrapResponse(estimate));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/calib/backfocus/:train_id", async (req, res) => {
    try {
      const offsets = await calibStorage.getBackfocusOffsets(req.params.train_id);
      res.json(wrapResponse(offsets));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== POINTING =====

  router.get("/calib/pointing", async (req, res) => {
    try {
      const { train_id } = req.query;
      const models = await calibStorage.getPointingModels(train_id ? String(train_id) : undefined);
      res.json(wrapResponse(models));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== PEC =====

  router.get("/calib/pec", async (req, res) => {
    try {
      const { mount_model, axis } = req.query;

      const filters: any = {};
      if (mount_model) filters.mountModel = String(mount_model);
      if (axis) filters.axis = String(axis);

      const profiles = await calibStorage.getPecProfiles(filters);
      res.json(wrapResponse(profiles));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== FILTERS =====

  router.get("/calib/filters", async (req, res) => {
    try {
      const { name } = req.query;
      const filters = await calibStorage.getFilters(name ? String(name) : undefined);
      res.json(wrapResponse(filters));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/calib/filters/:id/curve", async (req, res) => {
    try {
      const result = await calibStorage.getFilterWithCurve(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ error: "Filter not found" });
      }
      res.json(wrapResponse(result));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== SENSORS =====

  router.get("/calib/sensors", async (req, res) => {
    try {
      const { model } = req.query;
      const sensors = await calibStorage.getSensors(model ? String(model) : undefined);
      res.json(wrapResponse(sensors));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/calib/sensors/:id/qe", async (req, res) => {
    try {
      const result = await calibStorage.getSensorWithQe(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ error: "Sensor not found" });
      }
      res.json(wrapResponse(result));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

// Legacy export for backward compatibility
export function registerCalibRoutes(app: Express) {
  const router = createCalibRouter();
  app.use("/astrodb/v1", router);
}
