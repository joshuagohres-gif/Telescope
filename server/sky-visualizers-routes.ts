import express from "express";
import { skyVisualizersStorage } from "./sky-visualizers-storage";
import {
  generateTrajectory,
  generateSkyPath,
  calculateGeocentricPosition,
  type OrbitalElements,
} from "./lib/astro/orbital-simulator";

/**
 * Wraps response data in a consistent format
 */
function wrapResponse(data: any, extra?: any) {
  return {
    data,
    version: "1.0.0",
    generated_at: new Date().toISOString(),
    ...extra,
  };
}

/**
 * Creates the sky visualizers router
 */
export function createSkyVisualizersRouter(): express.Router {
  const router = express.Router();

  /**
   * GET /sky-visualizers/objects
   * List all available solar system objects
   * Query params:
   *   - type: Filter by object type (planet, comet, asteroid, etc.)
   *   - search: Search by name or designation
   *   - limit: Maximum number of results
   *   - offset: Pagination offset
   */
  router.get("/sky-visualizers/objects", async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const search = req.query.search as string | undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string, 10)
        : undefined;

      const objects = await skyVisualizersStorage.getObjects({
        type,
        search,
        limit,
        offset,
      });

      res.json(
        wrapResponse(objects, {
          count: objects.length,
        })
      );
    } catch (error: any) {
      console.error("Error fetching objects:", error);
      res.status(500).json({
        error: "Failed to fetch objects",
        message: error.message,
      });
    }
  });

  /**
   * GET /sky-visualizers/objects/:id
   * Get details for a specific object
   */
  router.get("/sky-visualizers/objects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid object ID" });
      }

      const object = await skyVisualizersStorage.getObjectById(id);
      if (!object) {
        return res.status(404).json({ error: "Object not found" });
      }

      // Get latest orbital data
      const orbital = await skyVisualizersStorage.getOrbitalData(object.id);
      const assets = await skyVisualizersStorage.getAssets(object.id);

      res.json(
        wrapResponse({
          ...object,
          orbital_data: orbital || null,
          assets: assets,
        })
      );
    } catch (error: any) {
      console.error("Error fetching object:", error);
      res.status(500).json({
        error: "Failed to fetch object",
        message: error.message,
      });
    }
  });

  /**
   * GET /sky-visualizers/objects/:id/trajectory
   * Get orbital trajectory for an object
   * Query params:
   *   - start_date: ISO date string
   *   - end_date: ISO date string
   *   - step_days: Step size in days (default: 1.0)
   *   - use_cache: Whether to use cached data (default: true)
   */
  router.get("/sky-visualizers/objects/:id/trajectory", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid object ID" });
      }

      const startDateStr = req.query.start_date as string;
      const endDateStr = req.query.end_date as string;
      const stepDays = req.query.step_days
        ? parseFloat(req.query.step_days as string)
        : 1.0;
      const useCache = req.query.use_cache !== "false";

      if (!startDateStr || !endDateStr) {
        return res
          .status(400)
          .json({ error: "start_date and end_date are required" });
      }

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      // Get object and orbital data
      const object = await skyVisualizersStorage.getObjectById(id);
      if (!object) {
        return res.status(404).json({ error: "Object not found" });
      }

      const orbital = await skyVisualizersStorage.getOrbitalData(object.id);
      if (!orbital) {
        return res.status(404).json({
          error: "Orbital data not found for this object",
        });
      }

      // Check cache
      if (useCache) {
        const cached = await skyVisualizersStorage.getTrajectoryCache(
          id,
          startDate,
          endDate,
          stepDays
        );

        if (cached) {
          return res.json(
            wrapResponse(cached.points, {
              cached: true,
              computed_at: cached.computedAt,
            })
          );
        }
      }

      // Generate trajectory
      const elements: OrbitalElements = {
        a: orbital.a,
        e: orbital.e,
        i: orbital.i,
        omega: orbital.omega,
        w: orbital.w,
        m: orbital.m,
        n: orbital.n || undefined,
        epoch: orbital.epoch,
      };

      const trajectory = generateTrajectory(
        elements,
        startDate,
        endDate,
        stepDays
      );

      // Cache the result
      await skyVisualizersStorage.saveTrajectoryCache({
        objectId: id,
        startDate,
        endDate,
        stepDays,
        points: trajectory as any,
      });

      res.json(
        wrapResponse(trajectory, {
          cached: false,
        })
      );
    } catch (error: any) {
      console.error("Error generating trajectory:", error);
      res.status(500).json({
        error: "Failed to generate trajectory",
        message: error.message,
      });
    }
  });

  /**
   * GET /sky-visualizers/objects/:id/sky-path
   * Get sky path from Earth observer location
   * Query params:
   *   - lat: Observer latitude (degrees)
   *   - lon: Observer longitude (degrees)
   *   - start_date: ISO date string
   *   - end_date: ISO date string
   *   - step_hours: Step size in hours (default: 1.0)
   *   - use_cache: Whether to use cached data (default: true)
   */
  router.get("/sky-visualizers/objects/:id/sky-path", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid object ID" });
      }

      const latStr = req.query.lat as string;
      const lonStr = req.query.lon as string;
      const startDateStr = req.query.start_date as string;
      const endDateStr = req.query.end_date as string;
      const stepHours = req.query.step_hours
        ? parseFloat(req.query.step_hours as string)
        : 1.0;
      const useCache = req.query.use_cache !== "false";

      if (!latStr || !lonStr || !startDateStr || !endDateStr) {
        return res.status(400).json({
          error: "lat, lon, start_date, and end_date are required",
        });
      }

      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      if (
        isNaN(lat) ||
        isNaN(lon) ||
        isNaN(startDate.getTime()) ||
        isNaN(endDate.getTime())
      ) {
        return res.status(400).json({ error: "Invalid parameter format" });
      }

      // Get object and orbital data
      const object = await skyVisualizersStorage.getObjectById(id);
      if (!object) {
        return res.status(404).json({ error: "Object not found" });
      }

      const orbital = await skyVisualizersStorage.getOrbitalData(object.id);
      if (!orbital) {
        return res.status(404).json({
          error: "Orbital data not found for this object",
        });
      }

      // Check cache
      if (useCache) {
        const cached = await skyVisualizersStorage.getSkyPathCache(
          id,
          lat,
          lon,
          startDate,
          endDate,
          stepHours
        );

        if (cached) {
          return res.json(
            wrapResponse(cached.pathPoints, {
              cached: true,
              computed_at: cached.computedAt,
            })
          );
        }
      }

      // Generate sky path
      const elements: OrbitalElements = {
        a: orbital.a,
        e: orbital.e,
        i: orbital.i,
        omega: orbital.omega,
        w: orbital.w,
        m: orbital.m,
        n: orbital.n || undefined,
        epoch: orbital.epoch,
      };

      const skyPath = generateSkyPath(
        elements,
        startDate,
        endDate,
        lat,
        lon,
        stepHours
      );

      // Cache the result
      await skyVisualizersStorage.saveSkyPathCache({
        objectId: id,
        observerLat: lat,
        observerLon: lon,
        startDate,
        endDate,
        stepHours,
        pathPoints: skyPath as any,
      });

      res.json(
        wrapResponse(skyPath, {
          cached: false,
        })
      );
    } catch (error: any) {
      console.error("Error generating sky path:", error);
      res.status(500).json({
        error: "Failed to generate sky path",
        message: error.message,
      });
    }
  });

  /**
   * GET /sky-visualizers/objects/:id/position
   * Get current position of an object
   * Query params:
   *   - date: ISO date string (default: now)
   */
  router.get("/sky-visualizers/objects/:id/position", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid object ID" });
      }

      const dateStr = req.query.date as string;
      const date = dateStr ? new Date(dateStr) : new Date();

      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      // Get object and orbital data
      const object = await skyVisualizersStorage.getObjectById(id);
      if (!object) {
        return res.status(404).json({ error: "Object not found" });
      }

      const orbital = await skyVisualizersStorage.getOrbitalData(object.id);
      if (!orbital) {
        return res.status(404).json({
          error: "Orbital data not found for this object",
        });
      }

      // Calculate position
      const elements: OrbitalElements = {
        a: orbital.a,
        e: orbital.e,
        i: orbital.i,
        omega: orbital.omega,
        w: orbital.w,
        m: orbital.m,
        n: orbital.n || undefined,
        epoch: orbital.epoch,
      };

      const position = calculateGeocentricPosition(elements, date);

      res.json(
        wrapResponse({
          ra: position.ra,
          dec: position.dec,
          distance: position.distance,
          ra_deg: (position.ra * 180) / Math.PI,
          dec_deg: (position.dec * 180) / Math.PI,
          ra_hours: (position.ra * 12) / Math.PI,
        })
      );
    } catch (error: any) {
      console.error("Error calculating position:", error);
      res.status(500).json({
        error: "Failed to calculate position",
        message: error.message,
      });
    }
  });

  /**
   * GET /sky-visualizers/assets/:object_id
   * Get visualization assets for an object
   */
  router.get("/sky-visualizers/assets/:object_id", async (req, res) => {
    try {
      const objectId = parseInt(req.params.object_id, 10);
      if (isNaN(objectId)) {
        return res.status(400).json({ error: "Invalid object ID" });
      }

      const assets = await skyVisualizersStorage.getAssets(objectId);

      res.json(wrapResponse(assets));
    } catch (error: any) {
      console.error("Error fetching assets:", error);
      res.status(500).json({
        error: "Failed to fetch assets",
        message: error.message,
      });
    }
  });

  return router;
}
