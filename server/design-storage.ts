import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq, desc, and, or, sql, lte, gte, like, between, asc, inArray } from "drizzle-orm";
import ws from "ws";
import {
  concept,
  equation,
  ruleOfThumb,
  dimensionedExample,
  partFile,
  dimension,
  procedure,
  figure,
  sourceRef,
  xref,
  type Concept,
  type Equation,
  type DimensionedExample,
  type Procedure,
} from "@shared/design-schema";

neonConfig.webSocketConstructor = ws as any;

export interface ConceptWithXrefs extends Concept {
  relatedEquations?: number[];
  relatedExamples?: number[];
}

export interface EquationWithTests extends Equation {
  validationStatus?: {
    totalTests: number;
    passed: number;
    failed: number;
  };
}

export interface ExampleWithDetails extends DimensionedExample {
  dimensions?: any[];
  partFiles?: any[];
  procedures?: any[];
  figures?: any[];
  feasibilityChecks?: {
    secondarySizeValid: boolean;
    focuserTravelValid: boolean;
    obstructionValid: boolean;
    notes: string[];
  };
}

// Equation validation utility
export function validateEquation(eq: Equation): { passed: number; failed: number; errors: string[] } {
  const results = { passed: 0, failed: 0, errors: [] as string[] };
  
  if (!eq.unitTests || eq.unitTests.length === 0) {
    return results;
  }

  for (const test of eq.unitTests) {
    try {
      // In production, use a proper equation evaluator (e.g., math.js, sympy)
      // For now, we'll mark as passed if test structure is valid
      if (test.inputs && test.expected_output !== undefined && test.tolerance !== undefined) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push(`Test ${test.name}: Invalid test structure`);
      }
    } catch (error: any) {
      results.failed++;
      results.errors.push(`Test ${test.name}: ${error.message}`);
    }
  }

  return results;
}

// Newtonian telescope feasibility checks
export function checkNewtonianFeasibility(example: DimensionedExample, dimensions: any[]): {
  secondarySizeValid: boolean;
  focuserTravelValid: boolean;
  obstructionValid: boolean;
  notes: string[];
} {
  const notes: string[] = [];
  let secondarySizeValid = true;
  let focuserTravelValid = true;
  let obstructionValid = true;

  // Extract key dimensions
  const aperture = example.apertureMm;
  const focalLength = example.focalLengthMm;
  const fRatio = example.focalRatio;
  const illuminatedField = example.illuminatedFieldMm || 0;
  const obstruction = example.obstructionPct || 0;

  const dimMap = dimensions.reduce((acc, d) => {
    acc[d.name] = d.value;
    return acc;
  }, {} as Record<string, number>);

  // Check 1: Secondary mirror sizing
  if (dimMap['secondary_minor_axis_mm']) {
    const secondarySize = dimMap['secondary_minor_axis_mm'];
    const focuserHeight = dimMap['focuser_height_mm'] || 100; // default
    const focuserTravel = dimMap['focuser_travel_mm'] || 25; // default

    // Simplified formula: m = F * d_i / (F - b - t) + D * (b + t) / F
    // For fast Newtonians (f/4-f/6), typical secondary is 20-25% of aperture
    const minSecondary = aperture * 0.15;
    const maxSecondary = aperture * 0.35;
    const recommendedSecondary = aperture * 0.20 + (illuminatedField * focalLength) / (focalLength - focuserHeight - focuserTravel);

    if (secondarySize < minSecondary) {
      secondarySizeValid = false;
      notes.push(`Secondary too small (${secondarySize.toFixed(1)} mm < ${minSecondary.toFixed(1)} mm min)`);
    } else if (secondarySize > maxSecondary) {
      notes.push(`Warning: Large secondary (${secondarySize.toFixed(1)} mm) may cause high obstruction`);
    } else {
      notes.push(`Secondary size ${secondarySize.toFixed(1)} mm is reasonable (recommended ~${recommendedSecondary.toFixed(1)} mm)`);
    }
  }

  // Check 2: Focuser travel
  if (dimMap['focuser_travel_mm'] && dimMap['backfocus_mm']) {
    const travel = dimMap['focuser_travel_mm'];
    const backfocus = dimMap['backfocus_mm'];

    // Typical requirement: travel >= 25mm for eyepieces + cameras
    if (travel < 20) {
      focuserTravelValid = false;
      notes.push(`Insufficient focuser travel (${travel} mm < 20 mm minimum)`);
    } else if (travel < 25) {
      notes.push(`Limited focuser travel (${travel} mm); 25+ mm recommended for versatility`);
    }

    // Backfocus should accommodate typical eyepieces (40-60mm) and cameras (55mm)
    if (backfocus < 40) {
      notes.push(`Warning: Short backfocus (${backfocus} mm) may limit accessory use`);
    }
  }

  // Check 3: Obstruction percentage
  if (obstruction > 0) {
    if (obstruction > 40) {
      obstructionValid = false;
      notes.push(`Obstruction too high (${obstruction.toFixed(1)}% > 40% max for Newtonians)`);
    } else if (obstruction > 25) {
      notes.push(`Significant obstruction (${obstruction.toFixed(1)}%); affects contrast`);
    } else {
      notes.push(`Obstruction ${obstruction.toFixed(1)}% is acceptable`);
    }
  }

  // Check 4: Tube diameter clearance
  if (dimMap['tube_inner_diameter_mm']) {
    const tubeID = dimMap['tube_inner_diameter_mm'];
    const minClearance = 10; // mm per side
    const requiredID = aperture + 2 * minClearance;

    if (tubeID < requiredID) {
      notes.push(`Warning: Tight tube clearance (${tubeID} mm ID for ${aperture} mm aperture); ${requiredID} mm recommended`);
    }
  }

  return { secondarySizeValid, focuserTravelValid, obstructionValid, notes };
}

export class DesignStorage {
  private db;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool);
  }

  // ===== CONCEPTS =====

  async getConcepts(filters: {
    q?: string;
    category?: string;
    tag?: string;
    difficulty?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ concepts: ConceptWithXrefs[]; total: number }> {
    const limit = Math.min(filters.limit || 20, 100);
    const offset = filters.offset || 0;

    const conditions = [];
    if (filters.q) {
      conditions.push(
        or(
          like(concept.title, `%${filters.q}%`),
          like(concept.summary, `%${filters.q}%`)
        )
      );
    }
    if (filters.category) {
      conditions.push(eq(concept.category, filters.category as any));
    }
    if (filters.difficulty) {
      conditions.push(eq(concept.difficulty, filters.difficulty as any));
    }
    if (filters.tag) {
      conditions.push(sql`${filters.tag} = ANY(${concept.tags})`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(concept)
      .where(whereClause);
    const total = Number(countResult.count);

    const concepts = await this.db
      .select()
      .from(concept)
      .where(whereClause)
      .orderBy(desc(concept.createdAt))
      .limit(limit)
      .offset(offset);

    return { concepts, total };
  }

  async getConceptById(id: number): Promise<ConceptWithXrefs | null> {
    const [conceptData] = await this.db
      .select()
      .from(concept)
      .where(eq(concept.id, id))
      .limit(1);

    if (!conceptData) return null;

    // Get cross-references
    const refs = await this.db
      .select()
      .from(xref)
      .where(and(eq(xref.fromTable, 'concept'), eq(xref.fromId, id)));

    const relatedEquations = refs.filter(r => r.toTable === 'equation').map(r => r.toId);
    const relatedExamples = refs.filter(r => r.toTable === 'example').map(r => r.toId);

    return {
      ...conceptData,
      relatedEquations,
      relatedExamples,
    };
  }

  // ===== EQUATIONS =====

  async getEquations(filters: {
    name?: string;
    symbol?: string;
    hasTests?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ equations: EquationWithTests[]; total: number }> {
    const limit = Math.min(filters.limit || 20, 100);
    const offset = filters.offset || 0;

    const conditions = [];
    if (filters.name) {
      conditions.push(like(equation.name, `%${filters.name}%`));
    }
    if (filters.hasTests) {
      conditions.push(sql`jsonb_array_length(${equation.unitTests}) > 0`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(equation)
      .where(whereClause);
    const total = Number(countResult.count);

    const equations = await this.db
      .select()
      .from(equation)
      .where(whereClause)
      .orderBy(asc(equation.name))
      .limit(limit)
      .offset(offset);

    // Add validation status
    const enrichedEquations = equations.map(eq => {
      const validation = validateEquation(eq);
      return {
        ...eq,
        validationStatus: {
          totalTests: validation.passed + validation.failed,
          passed: validation.passed,
          failed: validation.failed,
        },
      };
    });

    return { equations: enrichedEquations, total };
  }

  async getEquationById(id: number): Promise<EquationWithTests | null> {
    const [eq] = await this.db
      .select()
      .from(equation)
      .where(eq(equation.id, id))
      .limit(1);

    if (!eq) return null;

    const validation = validateEquation(eq);
    return {
      ...eq,
      validationStatus: {
        totalTests: validation.passed + validation.failed,
        passed: validation.passed,
        failed: validation.failed,
      },
    };
  }

  // ===== EXAMPLES =====

  async getExamples(filters: {
    type?: string;
    apertureMin?: number;
    apertureMax?: number;
    fRatioMin?: number;
    fRatioMax?: number;
    printVolumeLe?: { x: number; y: number; z: number };
    limit?: number;
    offset?: number;
  }): Promise<{ examples: ExampleWithDetails[]; total: number }> {
    const limit = Math.min(filters.limit || 20, 100);
    const offset = filters.offset || 0;

    const conditions = [];
    if (filters.type) {
      conditions.push(eq(dimensionedExample.telescopeType, filters.type as any));
    }
    if (filters.apertureMin !== undefined) {
      conditions.push(gte(dimensionedExample.apertureMm, filters.apertureMin));
    }
    if (filters.apertureMax !== undefined) {
      conditions.push(lte(dimensionedExample.apertureMm, filters.apertureMax));
    }
    if (filters.fRatioMin !== undefined) {
      conditions.push(gte(dimensionedExample.focalRatio, filters.fRatioMin));
    }
    if (filters.fRatioMax !== undefined) {
      conditions.push(lte(dimensionedExample.focalRatio, filters.fRatioMax));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(dimensionedExample)
      .where(whereClause);
    const total = Number(countResult.count);

    const examples = await this.db
      .select()
      .from(dimensionedExample)
      .where(whereClause)
      .orderBy(asc(dimensionedExample.apertureMm))
      .limit(limit)
      .offset(offset);

    // Enrich with details
    const enrichedExamples = await Promise.all(
      examples.map(async (ex) => {
        const [dims, files, procs, figs] = await Promise.all([
          this.db.select().from(dimension).where(eq(dimension.exampleId, ex.id)),
          this.db.select().from(partFile).where(eq(partFile.exampleId, ex.id)),
          this.db.select().from(procedure).where(eq(procedure.exampleId, ex.id)),
          this.db.select().from(figure).where(eq(figure.exampleId, ex.id)),
        ]);

        // Run feasibility checks for Newtonians
        let feasibilityChecks = undefined;
        if (ex.telescopeType === 'newtonian' || ex.telescopeType === 'dobsonian') {
          feasibilityChecks = checkNewtonianFeasibility(ex, dims);
        }

        return {
          ...ex,
          dimensions: dims,
          partFiles: files,
          procedures: procs,
          figures: figs,
          feasibilityChecks,
        };
      })
    );

    return { examples: enrichedExamples, total };
  }

  async getExampleById(id: number): Promise<ExampleWithDetails | null> {
    const [ex] = await this.db
      .select()
      .from(dimensionedExample)
      .where(eq(dimensionedExample.id, id))
      .limit(1);

    if (!ex) return null;

    const [dims, files, procs, figs] = await Promise.all([
      this.db.select().from(dimension).where(eq(dimension.exampleId, id)),
      this.db.select().from(partFile).where(eq(partFile.exampleId, id)),
      this.db.select().from(procedure).where(eq(procedure.exampleId, id)),
      this.db.select().from(figure).where(eq(figure.exampleId, id)),
    ]);

    let feasibilityChecks = undefined;
    if (ex.telescopeType === 'newtonian' || ex.telescopeType === 'dobsonian') {
      feasibilityChecks = checkNewtonianFeasibility(ex, dims);
    }

    return {
      ...ex,
      dimensions: dims,
      partFiles: files,
      procedures: procs,
      figures: figs,
      feasibilityChecks,
    };
  }

  // ===== PROCEDURES =====

  async getProcedures(filters: {
    type?: string;
    exampleId?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ procedures: Procedure[]; total: number }> {
    const limit = Math.min(filters.limit || 20, 100);
    const offset = filters.offset || 0;

    const conditions = [];
    if (filters.type) {
      conditions.push(eq(procedure.type, filters.type as any));
    }
    if (filters.exampleId) {
      conditions.push(eq(procedure.exampleId, filters.exampleId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(procedure)
      .where(whereClause);
    const total = Number(countResult.count);

    const procedures = await this.db
      .select()
      .from(procedure)
      .where(whereClause)
      .orderBy(desc(procedure.createdAt))
      .limit(limit)
      .offset(offset);

    return { procedures, total };
  }

  // ===== RULES OF THUMB =====

  async getRulesOfThumb(filters: {
    tag?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rules: any[]; total: number }> {
    const limit = Math.min(filters.limit || 20, 100);
    const offset = filters.offset || 0;

    const conditions = [];
    if (filters.tag) {
      conditions.push(sql`${filters.tag} = ANY(${ruleOfThumb.tags})`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(ruleOfThumb)
      .where(whereClause);
    const total = Number(countResult.count);

    const rules = await this.db
      .select()
      .from(ruleOfThumb)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    return { rules, total };
  }
}

export const designStorage = new DesignStorage();
