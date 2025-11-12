import express from "express";
import { skymapStorage } from "./skymap-storage";

/**
 * Middleware to check if skymap features are enabled
 */
function checkSkymapFeatureFlag(req: any, res: any, next: any) {
  if (process.env.ASTRO_SKYMAP_ENABLED !== "true") {
    return res.status(404).json({
      error: "Community Sky Map features not enabled",
      hint: "Set ASTRO_SKYMAP_ENABLED=true in your .env file",
    });
  }
  next();
}

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
 * Creates the skymap router
 */
export function createSkymapRouter(): express.Router {
  const router = express.Router();

  // Apply feature flag middleware to all routes
  router.use(checkSkymapFeatureFlag);

  /**
   * GET /skymap/photos
   * Returns all sky map photos with optional time filtering
   * Query params:
   *   - time_range: 'tonight' | 'week' | 'month' | 'year' | 'all' (default: 'all')
   */
  router.get("/skymap/photos", async (req, res) => {
    try {
      const timeRange = req.query.time_range as 'tonight' | 'week' | 'month' | 'year' | 'all' | undefined;

      // Validate time_range parameter if provided
      const validRanges = ['tonight', 'week', 'month', 'year', 'all'];
      if (timeRange && !validRanges.includes(timeRange)) {
        return res.status(400).json({
          error: "Invalid time_range parameter",
          hint: `Must be one of: ${validRanges.join(', ')}`,
        });
      }

      const photos = await skymapStorage.getPhotos(timeRange);

      res.json(wrapResponse(photos, {
        count: photos.length,
        time_range: timeRange || 'all',
      }));
    } catch (error: any) {
      console.error("Error fetching skymap photos:", error);
      res.status(500).json({
        error: "Failed to fetch skymap photos",
        message: error.message,
      });
    }
  });

  /**
   * GET /skymap/photos/:id
   * Returns a single photo by ID
   */
  router.get("/skymap/photos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const photo = await skymapStorage.getPhotoById(id);

      if (!photo) {
        return res.status(404).json({
          error: "Photo not found",
          id,
        });
      }

      res.json(wrapResponse(photo));
    } catch (error: any) {
      console.error("Error fetching skymap photo:", error);
      res.status(500).json({
        error: "Failed to fetch skymap photo",
        message: error.message,
      });
    }
  });

  return router;
}
