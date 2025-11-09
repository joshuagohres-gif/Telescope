/**
 * OpenCascade WASM CAD Worker
 *
 * This Web Worker provides a sandboxed execution environment for:
 * - Loading OpenCascade.js (OCCT WASM)
 * - Executing CADScript ES modules
 * - Generating meshes for 3D visualization
 * - Exporting STEP/STL files
 *
 * All operations are asynchronous and use a message protocol.
 */

import type {
  WorkerReq,
  WorkerRes,
  BuildReq,
  BuildRes,
  ExportReq,
  ExportRes,
  ImportReq,
  ImportRes,
  Err,
  ProgressEvent,
  LogEvent,
  WorkerConfig,
} from '../types/worker-protocol';
import type { BuildContext, Shape } from '../types/cad-runtime';
import {
  createPrimitivesAPI,
  createOpsAPI,
  createBoolAPI,
  createQueryAPI,
  meshShape,
  type OCCTInstance,
} from '../runtime/occt-runtime';
import { exportSTEP } from '../io/step-export';
import { exportSTL } from '../io/stl-export';
import { importSTEP } from '../io/step-import';

// ===== CONFIGURATION =====

const DEFAULT_CONFIG: WorkerConfig = {
  wasmPath: 'https://cdn.jsdelivr.net/npm/opencascade.js@2.0.0/dist/opencascade.wasm.wasm',
  maxMemoryMB: 1200,
  timeoutMs: 10000,
  enableLogging: true,
  cachingEnabled: true,
};

let config: WorkerConfig = { ...DEFAULT_CONFIG };

// ===== STATE =====

let occt: any = null;  // OpenCascade.js module instance
let isInitialized = false;
let currentOperation: string | null = null;
let operationStartTime = 0;

// Simple in-memory cache for built shapes
const shapeCache = new Map<string, {
  shape: Shape;
  mesh: ArrayBuffer;
  triCount: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
  volume?: number;
  surfaceArea?: number;
  topologyMap: Record<string, string[]>;
}>();

// ===== LOGGING =====

function log(level: 'info' | 'warn' | 'error', message: string) {
  if (!config.enableLogging) return;

  const logEvent: LogEvent = {
    type: 'log',
    level,
    message,
    timestamp: Date.now(),
  };

  self.postMessage(logEvent);
}

function progress(operation: string, progressValue: number, message?: string) {
  const event: ProgressEvent = {
    type: 'progress',
    operation,
    progress: Math.max(0, Math.min(1, progressValue)),
    message,
  };

  self.postMessage(event);
}

// ===== ERROR HANDLING =====

function createError(error: string, stack?: string, logMessages?: string[]): Err {
  return {
    ok: false,
    error,
    stack,
    log: logMessages,
  };
}

// ===== OCCT INITIALIZATION =====

async function initializeOCCT(): Promise<void> {
  if (isInitialized) return;

  try {
    log('info', 'Loading OpenCascade WASM module...');
    progress('init', 0.1, 'Downloading WASM');

    // Import OpenCascade.js dynamically
    // NOTE: In production, we'll use opencascade.js from npm or CDN
    // For now, this is a placeholder that will be replaced with actual OCCT loading
    // @ts-ignore - OCCT will be loaded dynamically
    const initOCC = (await import('opencascade.js')).default;

    progress('init', 0.5, 'Initializing OCCT');

    occt = await initOCC({
      locateFile: (path: string) => {
        if (path.endsWith('.wasm')) return config.wasmPath;
        return path;
      },
      // Memory configuration
      TOTAL_MEMORY: config.maxMemoryMB * 1024 * 1024,
    });

    isInitialized = true;
    log('info', 'OpenCascade WASM initialized successfully');
    progress('init', 1.0, 'Ready');
  } catch (error) {
    const err = error as Error;
    log('error', `OCCT initialization failed: ${err.message}`);
    throw createError(`Failed to initialize OpenCascade: ${err.message}`, err.stack);
  }
}

// ===== CAD RUNTIME CONTEXT =====

/**
 * Build the CAD Runtime API (BuildContext) that gets exposed to CADScript
 * This implements all the primitives, operations, boolean ops, etc.
 */
function createBuildContext(): BuildContext {
  if (!occt) {
    throw new Error('OCCT not initialized');
  }

  // Feature tagging storage
  const features = new Map<string, Shape>();

  return {
    // Primitives (implemented in occt-runtime.ts)
    primitives: createPrimitivesAPI(occt),

    // Operations (implemented in occt-runtime.ts)
    ops: createOpsAPI(occt),

    // Boolean operations (implemented in occt-runtime.ts)
    bool: createBoolAPI(occt),

    // Query operations (implemented in occt-runtime.ts)
    query: createQueryAPI(occt),

    // Feature tagging
    feature: Object.assign(
      (name: string, shape: Shape) => {
        features.set(name, shape);
        log('info', `Tagged feature: ${name}`);
      },
      {
        all: () => {
          const result: Record<string, Shape> = {};
          features.forEach((shape, name) => {
            result[name] = shape;
          });
          return result;
        },
        clear: () => {
          features.clear();
        },
      }
    ),

    // Constants
    PI: Math.PI,
    DEG_TO_RAD: Math.PI / 180,
    RAD_TO_DEG: 180 / Math.PI,

    // Utility
    log: (message: string) => log('info', `[CADScript] ${message}`),
    warn: (message: string) => log('warn', `[CADScript] ${message}`),
    error: (message: string) => log('error', `[CADScript] ${message}`),
  };
}

// ===== REQUEST HANDLERS =====

async function handleInit(): Promise<void> {
  await initializeOCCT();
}

async function handleBuild(req: BuildReq): Promise<BuildRes> {
  if (!isInitialized || !occt) {
    throw createError('Worker not initialized. Call init first.');
  }

  const { cadScript, params, mesher } = req;
  const linearDeflection = mesher?.linearDeflection ?? 0.1;
  const angularDeflection = mesher?.angularDeflection ?? 0.5;

  log('info', `Building model with ${Object.keys(params).length} parameters`);
  progress('buildModel', 0.1, 'Compiling CADScript');

  try {
    // Create a sandboxed execution context
    const ctx = createBuildContext();

    progress('buildModel', 0.3, 'Executing CADScript');

    // Execute the CADScript module
    // We create a Function from the ES module text and execute it
    // Security note: This runs in an isolated Worker, not the main thread
    const moduleFunc = new Function('ctx', 'params', `
      ${cadScript}
      return build(ctx, params);
    `);

    const shape = await moduleFunc(ctx, params);

    if (!shape) {
      throw new Error('CADScript did not return a shape');
    }

    progress('buildModel', 0.5, 'Meshing geometry');

    // Mesh the shape using OCCT
    const meshResult = meshShape(occt, shape, linearDeflection, angularDeflection);

    progress('buildModel', 0.8, 'Computing properties');

    // Compute geometric properties
    const bbox = ctx.query.boundingBox(shape);
    const volume = ctx.query.volume(shape);
    const surfaceArea = ctx.query.surfaceArea(shape);

    progress('buildModel', 0.9, 'Building topology map');

    // Get feature topology map
    const features = ctx.feature.all();
    const topologyMap: Record<string, string[]> = {};

    for (const [name, featureShape] of Object.entries(features)) {
      const faces = ctx.query.faces(featureShape);
      topologyMap[name] = faces.map((_, i) => `${name}_face_${i}`);
    }

    const shapeId = `shape_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const result: BuildRes = {
      ok: true,
      shapeId,
      triCount: meshResult.triCount,
      mesh: meshResult.vertices.buffer,
      edges: meshResult.edges?.buffer,
      topologyMap,
      bbox: {
        min: [bbox.min.x, bbox.min.y, bbox.min.z],
        max: [bbox.max.x, bbox.max.y, bbox.max.z],
      },
      volume,
      surfaceArea,
    };

    // Cache the result
    if (config.cachingEnabled) {
      shapeCache.set(shapeId, {
        shape,
        mesh: meshResult.vertices.buffer,
        triCount: meshResult.triCount,
        bbox: result.bbox,
        volume,
        surfaceArea,
        topologyMap,
      });
    }

    progress('buildModel', 1.0, 'Complete');
    log('info', `Build complete: ${result.triCount} triangles, volume: ${volume.toFixed(2)}`);

    return result;
  } catch (error) {
    const err = error as Error;
    log('error', `Build failed: ${err.message}`);
    throw createError(`CADScript execution failed: ${err.message}`, err.stack);
  }
}

async function handleExport(req: ExportReq): Promise<ExportRes> {
  if (!isInitialized || !occt) {
    throw createError('Worker not initialized. Call init first.');
  }

  const { type, shapeId, binary } = req;

  log('info', `Exporting ${type} for shape ${shapeId}`);
  progress('export', 0.2, `Looking up shape ${shapeId}`);

  // Get the shape from cache
  const cached = shapeCache.get(shapeId);
  if (!cached) {
    throw createError(`Shape ${shapeId} not found in cache`);
  }

  const occtShape = cached.shape;

  try {
    let bytes: ArrayBuffer;

    if (type === 'exportSTEP') {
      progress('export', 0.5, 'Generating STEP file');
      bytes = exportSTEP(occt, occtShape, {
        schema: 'AP214',
        unit: 'MM',
        metadata: {
          author: 'Telescope CAD Engine',
          organization: 'Generated Model',
        },
      });
      log('info', `STEP export complete: ${bytes.byteLength} bytes`);
    } else {
      // exportSTL
      progress('export', 0.5, 'Generating STL file');
      bytes = exportSTL(occt, occtShape, {
        binary: binary ?? true,
        linearDeflection: 0.1,
        angularDeflection: 0.5,
      });
      log('info', `STL export complete: ${bytes.byteLength} bytes`);
    }

    progress('export', 1.0, 'Complete');

    return {
      ok: true,
      bytes,
      format: type === 'exportSTEP' ? 'STEP' : 'STL',
    };
  } catch (error) {
    const err = error as Error;
    log('error', `Export failed: ${err.message}`);
    throw createError(`Export failed: ${err.message}`, err.stack);
  }
}

async function handleImport(req: ImportReq): Promise<ImportRes> {
  if (!isInitialized || !occt) {
    throw createError('Worker not initialized. Call init first.');
  }

  const { stepBytes, heal: healOptions } = req;

  log('info', `Importing STEP file (${stepBytes.byteLength} bytes)`);
  progress('import', 0.2, 'Reading STEP file');

  try {
    // Import STEP with healing
    const { shape, stats } = importSTEP(occt, stepBytes, {
      heal: healOptions || {
        sew: true,
        fixSmallEdges: true,
        fixSmallFaces: true,
        fixShapes: true,
        tolerance: healOptions?.tolerance ?? 1e-7,
      },
      unit: 'MM',
      verbose: true,
    });

    progress('import', 0.8, 'Caching imported shape');

    // Generate shape ID and cache
    const shapeId = `imported_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Mesh the imported shape for preview
    const meshResult = meshShape(occt, shape, 0.1, 0.5);

    if (config.cachingEnabled) {
      shapeCache.set(shapeId, {
        shape,
        mesh: meshResult.vertices.buffer,
        triCount: meshResult.triCount,
        bbox: {
          min: [0, 0, 0],
          max: [0, 0, 0],
        },
        topologyMap: {},
      });
    }

    progress('import', 1.0, 'Complete');
    log('info', `Import complete: shape ${shapeId}, ${stats.facesHealed} faces healed`);

    return {
      ok: true,
      shapeId,
      stats: {
        edgesMerged: stats.edgesMerged,
        openWires: stats.openWires,
        facesHealed: stats.facesHealed,
      },
    };
  } catch (error) {
    const err = error as Error;
    log('error', `Import failed: ${err.message}`);
    throw createError(`STEP import failed: ${err.message}`, err.stack);
  }
}

// ===== MESSAGE HANDLER =====

self.onmessage = async (event: MessageEvent<WorkerReq>) => {
  const req = event.data;

  try {
    currentOperation = req.type;
    operationStartTime = Date.now();

    let response: WorkerRes;

    switch (req.type) {
      case 'init':
        await handleInit();
        response = { ok: true };
        break;

      case 'buildModel':
        response = await handleBuild(req);
        break;

      case 'exportSTEP':
      case 'exportSTL':
        response = await handleExport(req);
        break;

      case 'importSTEP':
        response = await handleImport(req);
        break;

      case 'cancel':
        log('warn', 'Cancel requested');
        response = { ok: true };
        break;

      default:
        throw createError(`Unknown request type: ${(req as any).type}`);
    }

    self.postMessage(response);
  } catch (error) {
    if (error && typeof error === 'object' && 'ok' in error) {
      // Already an Err object
      self.postMessage(error);
    } else {
      const err = error as Error;
      self.postMessage(createError(err.message, err.stack));
    }
  } finally {
    currentOperation = null;
  }
};

// Signal ready
log('info', 'CAD Worker initialized and ready');
