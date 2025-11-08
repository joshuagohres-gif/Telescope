/**
 * AstroDB API Documentation Endpoint
 * 
 * Self-describing docs endpoint with example curls for enabled packs.
 */

import type { Express } from "express";
import { getAllFlags } from "./config/flags";

export function registerDocsRoute(app: Express) {
  app.get("/astrodb/v1/docs", (req, res) => {
    const flags = getAllFlags();
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    
    const examples: Record<string, string[]> = {};
    
    // Operations Pack examples
    if (flags.ops) {
      examples.ops = [
        `# Horizon data (interpolated 0-359°)`,
        `curl "${baseUrl}/astrodb/v1/ops/horizon?site_id=123e4567-e89b-12d3-a456-426614174000"`,
        ``,
        `# Dew risk calculation`,
        `curl "${baseUrl}/astrodb/v1/ops/dew/risk?site_id=123e4567-e89b-12d3-a456-426614174000&ts=2024-01-15T22:00:00Z"`,
        ``,
        `# Light pollution lookup`,
        `curl "${baseUrl}/astrodb/v1/ops/lightpollution?lat=34.2242&lon=-118.0574"`,
        ``,
        `# User site registry`,
        `curl "${baseUrl}/astrodb/v1/user/sites"`,
      ];
    }
    
    // Targets Pack examples
    if (flags.targets) {
      examples.targets = [
        `# Tonight's showpieces`,
        `curl "${baseUrl}/astrodb/v1/targets/tonight?lat=34.2242&lon=-118.0574&from=2024-01-15T20:00:00Z&to=2024-01-16T06:00:00Z&step=60m"`,
        ``,
        `# ISS passes`,
        `curl "${baseUrl}/astrodb/v1/targets/passes?norad_id=25544&lat=34.2242&lon=-118.0574&alt_m=0&from=2024-01-15T20:00:00Z&to=2024-01-16T08:00:00Z"`,
        ``,
        `# Lunar features near location`,
        `curl "${baseUrl}/astrodb/v1/targets/features?body=Moon&near=51.6,-9.4&radius_km=200"`,
      ];
    }
    
    // Calibration Pack examples
    if (flags.calib) {
      examples.calib = [
        `# Find best matching master flat`,
        `curl "${baseUrl}/astrodb/v1/calib/masters?train_id=123e4567-e89b-12d3-a456-426614174000&kind=flat&filter=L&temp_c=-10.0&gain=0&exp_s=2.5"`,
        ``,
        `# Estimate focus position`,
        `curl "${baseUrl}/astrodb/v1/equip/focus/estimate?train_id=123e4567-e89b-12d3-a456-426614174000&filter=L&temp_c=15.0"`,
      ];
    }
    
    // Plan & QA Pack examples
    if (flags.planqa) {
      examples.planqa = [
        `# Rule-based exposure recipe`,
        `curl "${baseUrl}/astrodb/v1/plan/recipe?target_class=dso&sky=20.5&filter=L"`,
        ``,
        `# Session QA summary`,
        `curl "${baseUrl}/astrodb/v1/qa/summary?session_id=123e4567-e89b-12d3-a456-426614174000"`,
      ];
    }
    
    res.json({
      enabled: flags,
      examples,
      version: "1.0.0",
      generated_at: new Date().toISOString(),
    });
  });
}
