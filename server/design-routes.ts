import type { Express, Request, Response } from "express";
import { designStorage } from "./design-storage";

// Feature flag check middleware
const checkDesignFeatureFlag = (req: Request, res: Response, next: any) => {
  if (process.env.ASTRO_DESIGN_KB_ENABLED !== "true") {
    return res.status(404).json({ error: "Design knowledge base is not enabled" });
  }
  next();
};

// Response wrapper
function wrapResponse(data: any, sources: any[] = []) {
  return {
    data,
    sources: sources.length > 0 ? sources : [
      {
        name: "Telescope Design Knowledge Base",
        license: "Various - see individual records",
      }
    ],
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
  };
}

export function registerDesignRoutes(app: Express) {
  // Apply feature flag check to all design routes
  app.use("/astrodb/v1/designs", checkDesignFeatureFlag);

  // ===== CONCEPTS =====

  app.get("/astrodb/v1/designs/concepts", async (req, res) => {
    try {
      const { q, category, tag, difficulty, limit, offset } = req.query;
      
      const result = await designStorage.getConcepts({
        q: q as string,
        category: category as string,
        tag: tag as string,
        difficulty: difficulty as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        ...wrapResponse(result.concepts),
        pagination: {
          limit: parseInt(req.query.limit as string || "20"),
          offset: parseInt(req.query.offset as string || "0"),
          total: result.total,
        },
      });
    } catch (error: any) {
      console.error("Error fetching concepts:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/designs/concepts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conceptData = await designStorage.getConceptById(id);
      
      if (!conceptData) {
        return res.status(404).json({ error: "Concept not found" });
      }

      res.json(wrapResponse(conceptData));
    } catch (error: any) {
      console.error("Error fetching concept:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== EQUATIONS =====

  app.get("/astrodb/v1/designs/equations", async (req, res) => {
    try {
      const { name, symbol, has_tests, limit, offset } = req.query;
      
      const result = await designStorage.getEquations({
        name: name as string,
        symbol: symbol as string,
        hasTests: has_tests === "true",
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        ...wrapResponse(result.equations),
        pagination: {
          limit: parseInt(req.query.limit as string || "20"),
          offset: parseInt(req.query.offset as string || "0"),
          total: result.total,
        },
      });
    } catch (error: any) {
      console.error("Error fetching equations:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/designs/equations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const eq = await designStorage.getEquationById(id);
      
      if (!eq) {
        return res.status(404).json({ error: "Equation not found" });
      }

      res.json(wrapResponse(eq));
    } catch (error: any) {
      console.error("Error fetching equation:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== EXAMPLES =====

  app.get("/astrodb/v1/designs/examples", async (req, res) => {
    try {
      const { 
        type, 
        aperture_min, 
        aperture_max, 
        f_ratio_min, 
        f_ratio_max,
        limit, 
        offset 
      } = req.query;
      
      const result = await designStorage.getExamples({
        type: type as string,
        apertureMin: aperture_min ? parseInt(aperture_min as string) : undefined,
        apertureMax: aperture_max ? parseInt(aperture_max as string) : undefined,
        fRatioMin: f_ratio_min ? parseFloat(f_ratio_min as string) : undefined,
        fRatioMax: f_ratio_max ? parseFloat(f_ratio_max as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        ...wrapResponse(result.examples),
        pagination: {
          limit: parseInt(req.query.limit as string || "20"),
          offset: parseInt(req.query.offset as string || "0"),
          total: result.total,
        },
      });
    } catch (error: any) {
      console.error("Error fetching examples:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/astrodb/v1/designs/examples/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const example = await designStorage.getExampleById(id);
      
      if (!example) {
        return res.status(404).json({ error: "Example not found" });
      }

      res.json(wrapResponse(example));
    } catch (error: any) {
      console.error("Error fetching example:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== PROCEDURES =====

  app.get("/astrodb/v1/designs/procedures", async (req, res) => {
    try {
      const { type, example_id, limit, offset } = req.query;
      
      const result = await designStorage.getProcedures({
        type: type as string,
        exampleId: example_id ? parseInt(example_id as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        ...wrapResponse(result.procedures),
        pagination: {
          limit: parseInt(req.query.limit as string || "20"),
          offset: parseInt(req.query.offset as string || "0"),
          total: result.total,
        },
      });
    } catch (error: any) {
      console.error("Error fetching procedures:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== RULES OF THUMB =====

  app.get("/astrodb/v1/designs/rules", async (req, res) => {
    try {
      const { tag, limit, offset } = req.query;
      
      const result = await designStorage.getRulesOfThumb({
        tag: tag as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        ...wrapResponse(result.rules),
        pagination: {
          limit: parseInt(req.query.limit as string || "20"),
          offset: parseInt(req.query.offset as string || "0"),
          total: result.total,
        },
      });
    } catch (error: any) {
      console.error("Error fetching rules:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== TRAINING EXPORT =====

  app.get("/astrodb/v1/designs/exports/training", async (req, res) => {
    try {
      const { format, split, seed } = req.query;
      
      if (format !== "ndjson") {
        return res.status(400).json({ error: "Only format=ndjson is supported" });
      }

      const splitType = (split as string) || "train";
      if (!["train", "val", "test"].includes(splitType)) {
        return res.status(400).json({ error: "split must be train, val, or test" });
      }

      // Get all examples
      const { examples } = await designStorage.getExamples({ limit: 1000, offset: 0 });

      // Simple split: 70% train, 15% val, 15% test
      const total = examples.length;
      const trainEnd = Math.floor(total * 0.7);
      const valEnd = Math.floor(total * 0.85);

      let selectedExamples = examples;
      if (splitType === "train") {
        selectedExamples = examples.slice(0, trainEnd);
      } else if (splitType === "val") {
        selectedExamples = examples.slice(trainEnd, valEnd);
      } else {
        selectedExamples = examples.slice(valEnd);
      }

      // Set headers for NDJSON download
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Content-Disposition', `attachment; filename="designs-${splitType}.ndjson"`);

      // Stream NDJSON lines
      for (const example of selectedExamples) {
        // Create instruction pair
        const instructionPair = {
          instruction: `Design a ${example.apertureMm} mm f/${example.focalRatio} ${example.telescopeType} telescope` +
            (example.illuminatedFieldMm ? ` that fully illuminates a ${example.illuminatedFieldMm} mm field` : "") +
            ` with a ${example.focuserType} focuser.`,
          input: {
            constraints: {
              aperture_mm: example.apertureMm,
              f_ratio: example.focalRatio,
              illuminated_field_mm: example.illuminatedFieldMm,
              focuser_type: example.focuserType,
              print_volume_mm: example.printVolumeMm,
            }
          },
          output: {
            major_dimensions: example.dimensions?.slice(0, 10).map((d: any) => ({
              name: d.name,
              value: d.value,
              unit: d.unitSi,
            })),
            bom: example.billOfMaterials?.slice(0, 5),
            print_settings: example.printSettings,
            reasoning_md: example.notesMd || "Design follows standard principles for this aperture class.",
            feasibility: example.feasibilityChecks,
          },
          provenance: {
            example_id: example.id,
            title: example.title,
          }
        };

        res.write(JSON.stringify(instructionPair) + '\n');
      }

      res.end();
    } catch (error: any) {
      console.error("Error exporting training data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Export manifest
  app.get("/astrodb/v1/designs/exports/manifest", async (req, res) => {
    try {
      const [
        { total: conceptCount },
        { total: equationCount },
        { total: exampleCount },
        { total: procedureCount },
      ] = await Promise.all([
        designStorage.getConcepts({ limit: 1, offset: 0 }),
        designStorage.getEquations({ limit: 1, offset: 0 }),
        designStorage.getExamples({ limit: 1, offset: 0 }),
        designStorage.getProcedures({ limit: 1, offset: 0 }),
      ]);

      // Calculate split sizes
      const trainSize = Math.floor(exampleCount * 0.7);
      const valSize = Math.floor(exampleCount * 0.15);
      const testSize = exampleCount - trainSize - valSize;

      const manifest = {
        version: "1.0.0",
        generatedAt: new Date().toISOString(),
        schemaVersion: "design-kb-v1",
        coverage: {
          concepts: conceptCount,
          equations: equationCount,
          examples: exampleCount,
          procedures: procedureCount,
        },
        splits: {
          train: { count: trainSize, percentage: 70 },
          val: { count: valSize, percentage: 15 },
          test: { count: testSize, percentage: 15 },
        },
        exports: {
          train: "/astrodb/v1/designs/exports/training?format=ndjson&split=train",
          val: "/astrodb/v1/designs/exports/training?format=ndjson&split=val",
          test: "/astrodb/v1/designs/exports/training?format=ndjson&split=test",
        },
      };

      res.json(manifest);
    } catch (error: any) {
      console.error("Error generating manifest:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Health check
  app.get("/astrodb/v1/designs/health", (req, res) => {
    res.json({ 
      status: "ok", 
      enabled: process.env.ASTRO_DESIGN_KB_ENABLED === "true",
      timestamp: new Date().toISOString() 
    });
  });

  // API documentation endpoint
  app.get("/astrodb/v1/designs/docs", (req, res) => {
    res.json({
      title: "Telescope Design Knowledge Base API",
      version: "1.0.0",
      endpoints: {
        concepts: {
          list: "GET /astrodb/v1/designs/concepts",
          get: "GET /astrodb/v1/designs/concepts/:id",
          params: { q: "search", category: "optics|mechanics|...", tag: "string", difficulty: "intro|intermediate|advanced" }
        },
        equations: {
          list: "GET /astrodb/v1/designs/equations",
          get: "GET /astrodb/v1/designs/equations/:id",
          params: { name: "search", has_tests: "boolean" }
        },
        examples: {
          list: "GET /astrodb/v1/designs/examples",
          get: "GET /astrodb/v1/designs/examples/:id",
          params: { type: "newtonian|refractor|...", aperture_min: "number", aperture_max: "number", f_ratio_min: "number", f_ratio_max: "number" }
        },
        procedures: {
          list: "GET /astrodb/v1/designs/procedures",
          params: { type: "assembly|collimation|test|...", example_id: "number" }
        },
        rules: {
          list: "GET /astrodb/v1/designs/rules",
          params: { tag: "string" }
        },
        exports: {
          training: "GET /astrodb/v1/designs/exports/training?format=ndjson&split=train|val|test",
          manifest: "GET /astrodb/v1/designs/exports/manifest"
        }
      }
    });
  });
}
