import type { Express, Request, Response } from "express";
import { designStorage } from "./design-storage";

// Helper function: Build system prompt with Design KB context
function buildSystemPrompt(concepts: any[], equations: any[], examples: any[], rules: any[]): string {
  return `You are an expert telescope designer with deep knowledge of optical design, mechanical engineering, and amateur telescope making.

# Your Task
Generate complete, physically feasible telescope design parameters based on user requirements.

# Design Knowledge Base Context

## Key Concepts (Top ${concepts.length}):
${concepts.slice(0, 5).map(c => `- ${c.title}: ${c.summary}`).join('\n')}

## Fundamental Equations (Top ${equations.length}):
${equations.slice(0, 5).map(e => `- ${e.name}: ${e.description}`).join('\n')}

## Example Designs (Top ${examples.length}):
${examples.slice(0, 3).map(ex => `- ${ex.title}: ${ex.apertureMm}mm f/${ex.focalRatio} ${ex.telescopeType}`).join('\n')}

## Rules of Thumb (Top ${rules.length}):
${rules.slice(0, 10).map(r => `- ${r.statementMd}`).join('\n')}

# Design Constraints
1. All designs must be physically feasible and buildable
2. Aperture: 50mm - 400mm (amateur-friendly range)
3. Focal ratio: f/3.5 - f/15 (practical optical range)
4. Budget: Consider realistic costs for optics, mount, and accessories
5. Use standard focuser types: helical, rack_pinion, crayford
6. Obstruction < 40% for Newtonians/reflectors

# Output Format
Return ONLY valid JSON with this structure:
{
  "aperture_mm": number,
  "focal_ratio": number,
  "focal_length_mm": number,
  "type": "newtonian" | "dobsonian" | "refractor" | "sct" | "maksutov",
  "focuser_type": "helical" | "rack_pinion" | "crayford" | "printed_helical",
  "obstruction_pct": number | null,
  "tube_length_mm": number,
  "tube_diameter_mm": number,
  "secondary_size_mm": number | null,
  "mount_type": string,
  "budget_usd": number,
  "primary_use": string,
  "confidence": number (0-1),
  "reasoning": string,
  "recommendations": string[],
  "estimated_performance": {
    "limiting_magnitude": number,
    "resolution_arcsec": number,
    "max_magnification": number,
    "field_of_view_degrees": number
  }
}

# Important
- Be conservative and practical
- Reference seeded data concepts and equations in your reasoning
- Ensure all numeric values are consistent with optical equations
- Set confidence < 0.8 if requirements are vague or conflicting`;
}

// Helper function: Build user prompt from requirements
function buildUserPrompt(requirements: any): string {
  return `Design a telescope with these requirements:

Primary Use: ${requirements.primary_use || 'general purpose'}
Aperture Preference: ${requirements.aperture_preference || 'medium (150mm)'}
Budget: $${requirements.budget_usd || 400}
Portability: ${requirements.portability || 'moderate'}
Experience Level: ${requirements.experience_level || 'beginner'}
Observing Location: ${requirements.observing_location || 'suburban'}
Specific Targets: ${requirements.specific_targets || 'planets and deep-sky objects'}

Additional Notes: ${requirements.notes || 'none'}

Please generate a complete telescope design that meets these requirements.`;
}

// Helper function: Validate and enrich generated design
function validateAndEnrichDesign(design: any): any {
  // Calculate derived values if missing
  if (!design.focal_length_mm && design.aperture_mm && design.focal_ratio) {
    design.focal_length_mm = design.aperture_mm * design.focal_ratio;
  }

  // Validate focal length consistency
  const expectedFL = design.aperture_mm * design.focal_ratio;
  if (Math.abs(design.focal_length_mm - expectedFL) > expectedFL * 0.1) {
    design.focal_length_mm = expectedFL;
    design.confidence = Math.max(0, (design.confidence || 0.7) - 0.1);
  }

  // Calculate performance metrics if missing
  if (!design.estimated_performance) {
    design.estimated_performance = {
      limiting_magnitude: 2 + 5 * Math.log10(design.aperture_mm),
      resolution_arcsec: 116 / design.aperture_mm,
      max_magnification: 2 * design.aperture_mm,
      field_of_view_degrees: 50 / (design.focal_length_mm / 25), // Assumes 25mm, 50° eyepiece
    };
  }

  // Validate obstruction percentage
  if (design.obstruction_pct && design.obstruction_pct > 40) {
    design.warnings = design.warnings || [];
    design.warnings.push("High obstruction (>40%) will reduce contrast");
  }

  // Add feasibility flag
  design.feasible = true;
  if (design.aperture_mm > 400 || design.focal_ratio < 3.5 || design.focal_ratio > 15) {
    design.feasible = false;
    design.warnings = design.warnings || [];
    design.warnings.push("Design parameters outside typical amateur range");
  }

  return design;
}

// Fallback: Rule-based design generator (when LLM unavailable)
function generateFallbackDesign(requirements: any): any {
  const primaryUse = (requirements.primary_use || '').toLowerCase();
  const budget = requirements.budget_usd || 400;
  
  // Determine telescope type based on primary use and budget
  let design: any = {
    confidence: 0.6,
    reasoning: "Generated using rule-based fallback (LLM unavailable)",
  };

  if (primaryUse.includes('planet') || primaryUse.includes('lunar')) {
    // Planetary setup: longer focal ratio
    design = {
      ...design,
      aperture_mm: budget < 300 ? 100 : 150,
      focal_ratio: 8.0,
      type: "newtonian",
      focuser_type: "rack_pinion",
      obstruction_pct: 22,
      mount_type: "dobsonian",
      primary_use: "planetary",
    };
  } else if (primaryUse.includes('deep') || primaryUse.includes('galaxy') || primaryUse.includes('nebula')) {
    // Deep-sky setup: faster focal ratio, larger aperture
    design = {
      ...design,
      aperture_mm: budget < 300 ? 150 : 200,
      focal_ratio: 5.0,
      type: "dobsonian",
      focuser_type: "crayford",
      obstruction_pct: 24,
      mount_type: "dobsonian",
      primary_use: "deep_sky",
    };
  } else {
    // General purpose
    design = {
      ...design,
      aperture_mm: 130,
      focal_ratio: 5.0,
      type: "newtonian",
      focuser_type: "rack_pinion",
      obstruction_pct: 23,
      mount_type: "dobsonian",
      primary_use: "general",
    };
  }

  // Calculate derived values
  design.focal_length_mm = design.aperture_mm * design.focal_ratio;
  design.tube_length_mm = design.focal_length_mm * 0.85;
  design.tube_diameter_mm = design.aperture_mm + 20;
  design.secondary_size_mm = design.aperture_mm * 0.22;
  design.budget_usd = budget;

  // Calculate performance
  design.estimated_performance = {
    limiting_magnitude: 2 + 5 * Math.log10(design.aperture_mm),
    resolution_arcsec: 116 / design.aperture_mm,
    max_magnification: 2 * design.aperture_mm,
    field_of_view_degrees: 1.5,
  };

  design.recommendations = [
    "Consider upgrading to LLM-based generation for more detailed designs",
    `${design.aperture_mm}mm aperture is good for ${design.primary_use} observing`,
    "Start with this design and adjust based on your specific needs",
  ];

  design.feasible = true;

  return validateAndEnrichDesign(design);
}

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

  // ===== DESIGN GENERATION (LLM) =====

  app.post("/astrodb/v1/designs/generate", async (req, res) => {
    try {
      const { requirements } = req.body;

      if (!requirements) {
        return res.status(400).json({ error: "Requirements object is required" });
      }

      // Extract user requirements
      const {
        primary_use,
        aperture_preference,
        budget_usd,
        portability,
        experience_level,
        observing_location,
        specific_targets,
      } = requirements;

      console.log("🧠 Generating telescope design for requirements:", requirements);

      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        console.warn("⚠️  No OpenAI API key found, using rule-based fallback");
        const fallbackDesign = generateFallbackDesign(requirements);
        return res.json(wrapResponse(fallbackDesign));
      }

      // Generate design using OpenAI
      try {
        const OpenAI = await import("openai");
        const openai = new OpenAI.default({
          apiKey: process.env.OPENAI_API_KEY,
        });

        // Fetch relevant context from Design KB
        const [{ concepts }, { equations }, { examples }, { rules }] = await Promise.all([
          designStorage.getConcepts({ limit: 10 }),
          designStorage.getEquations({ limit: 10 }),
          designStorage.getExamples({ limit: 5 }),
          designStorage.getRulesOfThumb({ limit: 20 }),
        ]);

        // Build system prompt with seeded data context
        const systemPrompt = buildSystemPrompt(concepts, equations, examples, rules);

        // Generate design
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: buildUserPrompt(requirements) },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
          throw new Error("Empty response from OpenAI");
        }

        const design = JSON.parse(response);
        
        // Validate and enrich design
        const validatedDesign = validateAndEnrichDesign(design);

        res.json(wrapResponse(validatedDesign));
      } catch (llmError: any) {
        console.error("❌ LLM generation failed:", llmError.message);
        // Fallback to rule-based generation
        const fallbackDesign = generateFallbackDesign(requirements);
        res.json({
          ...wrapResponse(fallbackDesign),
          warning: "Used fallback generation due to LLM error",
        });
      }
    } catch (error: any) {
      console.error("Error generating design:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Health check
  app.get("/astrodb/v1/designs/health", (req, res) => {
    res.json({ 
      status: "ok", 
      enabled: process.env.ASTRO_DESIGN_KB_ENABLED === "true",
      llm_available: !!process.env.OPENAI_API_KEY,
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
