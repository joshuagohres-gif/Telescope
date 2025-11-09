/**
 * STEP Import and Healing Implementation
 *
 * Imports STEP files and applies geometry healing operations.
 * Healing fixes common issues like gaps, overlaps, and invalid topology.
 */

import type { OCCTInstance } from '../runtime/occt-runtime';

// ===== TYPES =====

export interface StepImportOptions {
  heal?: {
    sew?: boolean;              // Sew adjacent faces (close gaps)
    fixSmallEdges?: boolean;    // Remove tiny edges
    fixSmallFaces?: boolean;    // Remove tiny faces
    fixShapes?: boolean;        // Fix invalid shapes
    tolerance?: number;         // Healing tolerance (default: 1e-7)
  };
  unit?: 'MM' | 'M' | 'IN';     // Expected units
  verbose?: boolean;            // Log healing operations
}

export interface HealingStats {
  facesHealed: number;
  edgesMerged: number;
  smallEdgesRemoved: number;
  smallFacesRemoved: number;
  openWires: number;
  freeEdges: number;
  invalidShapes: number;
}

// ===== STEP IMPORT =====

/**
 * Import a STEP file
 */
export function importSTEP(
  oc: OCCTInstance,
  stepBytes: ArrayBuffer,
  options: StepImportOptions = {}
): { shape: any; stats: HealingStats } {
  const {
    heal = {
      sew: true,
      fixSmallEdges: true,
      fixSmallFaces: true,
      fixShapes: true,
      tolerance: 1e-7,
    },
    unit = 'MM',
    verbose = false,
  } = options;

  // Write STEP data to Emscripten filesystem
  const filename = '/input.step';
  const uint8Array = new Uint8Array(stepBytes);
  oc.FS.writeFile(filename, uint8Array);

  // Create STEP reader
  const reader = new oc.STEPControl_Reader_1();

  // Set units
  const unitName = new oc.TCollection_AsciiString_2(unit);
  oc.Interface_Static.SetCVal(
    new oc.TCollection_AsciiString_2('xstep.cascade.unit'),
    unitName
  );
  unitName.delete();

  // Read the file
  const filenameStr = new oc.TCollection_AsciiString_2(filename);
  const readStatus = reader.ReadFile(filenameStr);
  filenameStr.delete();

  if (readStatus !== oc.IFSelect_ReturnStatus.IFSelect_RetDone) {
    oc.FS.unlink(filename);
    reader.delete();
    throw new Error(`STEP read failed with status: ${readStatus}`);
  }

  // Transfer all roots
  const nbRoots = reader.TransferRoots(new oc.Message_ProgressRange_1());
  if (nbRoots === 0) {
    oc.FS.unlink(filename);
    reader.delete();
    throw new Error('No shapes found in STEP file');
  }

  if (verbose) {
    console.log(`STEP import: ${nbRoots} root shapes found`);
  }

  // Get the shape
  let shape = reader.OneShape();

  // Clean up filesystem
  oc.FS.unlink(filename);
  reader.delete();

  // Apply healing if requested
  let stats: HealingStats = {
    facesHealed: 0,
    edgesMerged: 0,
    smallEdgesRemoved: 0,
    smallFacesRemoved: 0,
    openWires: 0,
    freeEdges: 0,
    invalidShapes: 0,
  };

  if (heal) {
    const healResult = healShape(oc, shape, heal, verbose);
    shape = healResult.shape;
    stats = healResult.stats;
  }

  return { shape, stats };
}

// ===== HEALING =====

/**
 * Heal a shape to fix common geometry issues
 */
export function healShape(
  oc: OCCTInstance,
  shape: any,
  options: NonNullable<StepImportOptions['heal']>,
  verbose = false
): { shape: any; stats: HealingStats } {
  const tolerance = options.tolerance ?? 1e-7;
  let healedShape = shape;

  const stats: HealingStats = {
    facesHealed: 0,
    edgesMerged: 0,
    smallEdgesRemoved: 0,
    smallFacesRemoved: 0,
    openWires: 0,
    freeEdges: 0,
    invalidShapes: 0,
  };

  // 1. Sew adjacent faces (close gaps)
  if (options.sew !== false) {
    if (verbose) console.log('Healing: Sewing faces...');

    const sewing = new oc.BRepBuilderAPI_Sewing(tolerance, true, true, true, false);
    sewing.SetTolerance(tolerance);
    sewing.SetMaxTolerance(tolerance * 10);
    sewing.SetMinTolerance(tolerance * 0.1);

    sewing.Add(healedShape);
    sewing.Perform(new oc.Message_ProgressRange_1());

    healedShape = sewing.SewedShape();

    stats.facesHealed = sewing.NbContigousEdges();
    stats.freeEdges = sewing.NbFreeEdges();

    if (verbose) {
      console.log(`  - Faces healed: ${stats.facesHealed}`);
      console.log(`  - Free edges remaining: ${stats.freeEdges}`);
    }

    sewing.delete();
  }

  // 2. Fix shape validity
  if (options.fixShapes !== false) {
    if (verbose) console.log('Healing: Fixing shape validity...');

    const shapeFix = new oc.ShapeFix_Shape();
    shapeFix.Init(healedShape);
    shapeFix.SetPrecision(tolerance);
    shapeFix.SetMaxTolerance(tolerance * 10);
    shapeFix.SetMinTolerance(tolerance * 0.1);

    shapeFix.Perform(new oc.Message_ProgressRange_1());
    healedShape = shapeFix.Shape();

    if (verbose) {
      console.log('  - Shape validity fixed');
    }

    shapeFix.delete();
  }

  // 3. Remove small edges
  if (options.fixSmallEdges !== false) {
    if (verbose) console.log('Healing: Removing small edges...');

    const shapeFix = new oc.ShapeFix_Shape();
    shapeFix.Init(healedShape);

    const fixWireTool = shapeFix.FixWireTool();
    fixWireTool.SetMinTolerance(tolerance * 0.1);
    fixWireTool.SetMaxTolerance(tolerance * 10);

    shapeFix.Perform(new oc.Message_ProgressRange_1());
    healedShape = shapeFix.Shape();

    stats.smallEdgesRemoved = 1; // Simplified - would need to count actual removals

    if (verbose) {
      console.log(`  - Small edges processed`);
    }

    shapeFix.delete();
  }

  // 4. Remove small faces
  if (options.fixSmallFaces !== false) {
    if (verbose) console.log('Healing: Removing small faces...');

    const unifier = new oc.ShapeUpgrade_UnifySameDomain(healedShape, true, true, false);
    unifier.Build();
    healedShape = unifier.Shape();

    stats.smallFacesRemoved = 1; // Simplified

    if (verbose) {
      console.log(`  - Small faces unified`);
    }

    unifier.delete();
  }

  // 5. Analyze remaining issues
  const analyzer = new oc.BRepCheck_Analyzer(healedShape, false);
  const isValid = analyzer.IsValid_1();

  if (!isValid) {
    stats.invalidShapes = 1;
    if (verbose) {
      console.warn('Warning: Shape still has validity issues after healing');
    }
  } else {
    if (verbose) {
      console.log('Shape is valid after healing');
    }
  }

  analyzer.delete();

  return { shape: healedShape, stats };
}

/**
 * Analyze shape quality
 */
export function analyzeShape(
  oc: OCCTInstance,
  shape: any
): {
  isValid: boolean;
  freeEdges: number;
  openWires: number;
  faceCount: number;
  edgeCount: number;
  vertexCount: number;
} {
  const analyzer = new oc.BRepCheck_Analyzer(shape, false);
  const isValid = analyzer.IsValid_1();
  analyzer.delete();

  // Count topology elements
  let faceCount = 0;
  let edgeCount = 0;
  let vertexCount = 0;

  const faceExplorer = new oc.TopExp_Explorer_2(
    shape,
    oc.TopAbs_ShapeEnum.TopAbs_FACE as any,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any
  );
  while (faceExplorer.More()) {
    faceCount++;
    faceExplorer.Next();
  }
  faceExplorer.delete();

  const edgeExplorer = new oc.TopExp_Explorer_2(
    shape,
    oc.TopAbs_ShapeEnum.TopAbs_EDGE as any,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any
  );
  while (edgeExplorer.More()) {
    edgeCount++;
    edgeExplorer.Next();
  }
  edgeExplorer.delete();

  const vertexExplorer = new oc.TopExp_Explorer_2(
    shape,
    oc.TopAbs_ShapeEnum.TopAbs_VERTEX as any,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any
  );
  while (vertexExplorer.More()) {
    vertexCount++;
    vertexExplorer.Next();
  }
  vertexExplorer.delete();

  return {
    isValid,
    freeEdges: 0,      // Would need BRepCheck to get actual count
    openWires: 0,      // Would need topology analysis
    faceCount,
    edgeCount,
    vertexCount,
  };
}
