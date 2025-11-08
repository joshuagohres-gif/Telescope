import type { Express } from "express";
import { planQaStorage } from "./planqa-storage";

// Feature flag middleware
function checkPlanQaFeatureFlag(req: any, res: any, next: any) {
  if (process.env.ASTRO_PLANQA_ENABLED !== "true") {
    return res.status(404).json({
      error: "Planning, QA & Personalization features not enabled",
      hint: "Set ASTRO_PLANQA_ENABLED=true",
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

export function registerPlanQaRoutes(app: Express) {
  app.use("/astrodb/v1/planqa", checkPlanQaFeatureFlag);
  app.use("/astrodb/v1/plan", checkPlanQaFeatureFlag);
  app.use("/astrodb/v1/qa", checkPlanQaFeatureFlag);

  // ===== RECIPES =====

  app.get("/astrodb/v1/planqa/recipes", async (req, res) => {
    try {
      const { target_type, target_class, filter_name, filter, name, limit } = req.query;

      const filters: any = {};
      if (target_class) filters.targetClass = String(target_class);
      if (target_type) filters.targetType = String(target_type);
      if (filter) filters.filter = String(filter);
      if (filter_name) filters.filterName = String(filter_name);
      if (name) filters.name = String(name);
      if (limit) filters.limit = parseInt(String(limit));

      const recipes = await planQaStorage.getRecipes(filters);
      res.json(wrapResponse(recipes));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== SMART RECIPE (Rule-based) =====

  app.get("/astrodb/v1/plan/recipe", async (req, res) => {
    try {
      const { target_class, sky, filter, train_id } = req.query;

      if (!target_class || !sky || !filter) {
        return res.status(400).json({
          error: "Required parameters: target_class, sky, filter",
        });
      }

      const skyMpsas = parseFloat(String(sky));
      if (isNaN(skyMpsas)) {
        return res.status(400).json({ error: "Invalid sky value (expected mpsas)" });
      }

      const recipe = await planQaStorage.findRecipeByRule({
        targetClass: String(target_class),
        sky: skyMpsas,
        filter: String(filter),
        trainId: train_id ? String(train_id) : undefined,
      });

      if (!recipe) {
        return res.status(404).json({
          error: "No recipe found matching the criteria",
        });
      }

      res.json(wrapResponse(recipe));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/planqa/recipes/:id", async (req, res) => {
    try {
      const recipe = await planQaStorage.getRecipeById(parseInt(req.params.id));
      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }
      res.json(wrapResponse(recipe));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== SNR ESTIMATION =====

  app.get("/astrodb/v1/planqa/snr/estimate", async (req, res) => {
    try {
      const { train_id, filter_name, target_type, exposure_sec, sky_mpsas } = req.query;

      if (!train_id || !filter_name || !target_type || !exposure_sec || !sky_mpsas) {
        return res.status(400).json({
          error: "Required: train_id, filter_name, target_type, exposure_sec, sky_mpsas",
        });
      }

      const estimate = await planQaStorage.estimateSnr(
        String(train_id),
        String(filter_name),
        String(target_type),
        parseFloat(String(exposure_sec)),
        parseFloat(String(sky_mpsas))
      );

      if (!estimate) {
        return res.status(404).json({
          error: "No SNR model found for this configuration or exposure out of range",
        });
      }

      res.json(wrapResponse(estimate));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/planqa/snr/models", async (req, res) => {
    try {
      const { train_id, filter_name, target_type } = req.query;

      const filters: any = {};
      if (train_id) filters.trainId = String(train_id);
      if (filter_name) filters.filterName = String(filter_name);
      if (target_type) filters.targetType = String(target_type);

      const models = await planQaStorage.getSnrModels(filters);
      res.json(wrapResponse(models));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== SESSIONS =====

  app.get("/astrodb/v1/planqa/sessions", async (req, res) => {
    try {
      const { train_id, site_id, from, to, limit } = req.query;

      const filters: any = {};
      if (train_id) filters.trainId = String(train_id);
      if (site_id) filters.siteId = String(site_id);
      if (from) filters.from = new Date(String(from));
      if (to) filters.to = new Date(String(to));
      if (limit) filters.limit = parseInt(String(limit));

      const sessions = await planQaStorage.getSessions(filters);
      res.json(wrapResponse(sessions));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/planqa/sessions/:id", async (req, res) => {
    try {
      const session = await planQaStorage.getSessionById(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(wrapResponse(session));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/planqa/sessions/:id/metrics", async (req, res) => {
    try {
      const metrics = await planQaStorage.getSessionMetrics(req.params.id);
      res.json(wrapResponse(metrics));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/planqa/sessions/:id/qa", async (req, res) => {
    try {
      const summary = await planQaStorage.getSessionQaSummary(req.params.id);
      if (!summary) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(wrapResponse(summary));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== QA SUMMARY =====

  app.get("/astrodb/v1/qa/summary", async (req, res) => {
    try {
      const { session_id } = req.query;

      if (!session_id) {
        return res.status(400).json({ error: "Required parameter: session_id" });
      }

      const summary = await planQaStorage.getSessionQaSummary(String(session_id));
      if (!summary) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json(wrapResponse(summary));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== USER PROFILES =====

  app.get("/astrodb/v1/planqa/profiles/:user_id/sites", async (req, res) => {
    try {
      const profiles = await planQaStorage.getSiteProfiles(req.params.user_id);
      res.json(wrapResponse(profiles));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/planqa/profiles/:user_id/settings", async (req, res) => {
    try {
      const settings = await planQaStorage.getUserSettings(req.params.user_id);
      if (!settings) {
        return res.status(404).json({ error: "User settings not found" });
      }
      res.json(wrapResponse(settings));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
