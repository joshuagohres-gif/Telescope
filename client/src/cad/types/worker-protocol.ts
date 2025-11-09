/**
 * Worker Message Protocol for OpenCascade WASM CAD Engine
 *
 * This defines the contract between the main thread and the CAD Worker.
 * All operations are asynchronous and return Ok<T> | Err results.
 */

// ===== REQUEST TYPES =====

export interface InitReq {
  type: 'init';
}

export interface BuildReq {
  type: 'buildModel';
  cadScript: string;                // ES module text to execute
  params: Record<string, any>;      // Validated against ParamSchema
  mesher?: {
    linearDeflection?: number;      // Default: 0.1
    angularDeflection?: number;     // Default: 0.5 (radians)
  };
}

export interface ExportReq {
  type: 'exportSTEP' | 'exportSTL';
  shapeId: string;
  binary?: boolean;                 // For STL: true=binary, false=ASCII
}

export interface ImportReq {
  type: 'importSTEP';
  stepBytes: ArrayBuffer;
  heal?: {
    sew?: boolean;                  // Sew adjacent faces
    fixSmallEdges?: boolean;        // Remove tiny edges
    tolerance?: number;             // Healing tolerance (default: 1e-7)
  };
}

export interface CancelReq {
  type: 'cancel';
  operationId?: string;             // Cancel specific operation or all
}

export type WorkerReq = InitReq | BuildReq | ExportReq | ImportReq | CancelReq;

// ===== RESPONSE TYPES =====

export interface Ok<T> {
  ok: true;
  requestId?: string;
}

export interface Err {
  ok: false;
  error: string;
  log?: string[];
  stack?: string;
}

export interface BuildRes extends Ok<{
  shapeId: string;
  triCount: number;
  mesh: ArrayBuffer;                // Interleaved vertices + normals (Float32Array)
  edges?: ArrayBuffer;              // Edge lines (Float32Array)
  topologyMap: Record<string, string[]>;  // Feature name -> face IDs
  bbox: {
    min: [number, number, number];
    max: [number, number, number];
  };
  volume?: number;
  surfaceArea?: number;
}> {}

export interface ExportRes extends Ok<{
  bytes: ArrayBuffer;
  format: 'STEP' | 'STL';
}> {}

export interface ImportRes extends Ok<{
  shapeId: string;
  stats: {
    edgesMerged: number;
    openWires: number;
    facesHealed: number;
  };
}> {}

export interface ProgressEvent {
  type: 'progress';
  operation: string;
  progress: number;               // 0-1
  message?: string;
}

export interface LogEvent {
  type: 'log';
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

export type WorkerRes = BuildRes | ExportRes | ImportRes | Err | ProgressEvent | LogEvent;

// ===== MESH DATA STRUCTURES =====

export interface MeshData {
  vertices: Float32Array;          // [x,y,z, nx,ny,nz, ...] interleaved
  indices?: Uint32Array;           // Triangle indices (optional)
  edges?: Float32Array;            // [x1,y1,z1, x2,y2,z2, ...] line segments
  normals?: Float32Array;          // Per-vertex normals (if not interleaved)
  uvs?: Float32Array;              // Texture coordinates (future)
}

export interface TopologyData {
  features: Record<string, {
    faceIds: string[];
    type: 'solid' | 'shell' | 'face' | 'edge' | 'vertex';
    volume?: number;
    area?: number;
  }>;
  hierarchy: {
    solids: string[];
    shells: string[];
    faces: string[];
    edges: string[];
    vertices: string[];
  };
}

// ===== WORKER CONFIGURATION =====

export interface WorkerConfig {
  wasmPath: string;                // Path to opencascade.wasm
  maxMemoryMB: number;             // Memory limit (default: 1200)
  timeoutMs: number;               // Per-operation timeout (default: 10000)
  enableLogging: boolean;          // Structured logging (default: true)
  cachingEnabled: boolean;         // Cache meshes by (script, params, mesher)
}

// ===== CACHE KEY =====

export interface CacheKey {
  cadScript: string;
  params: Record<string, any>;
  mesher: {
    linearDeflection: number;
    angularDeflection: number;
  };
}

export function computeCacheKey(key: CacheKey): string {
  // Deterministic SHA-256 hash (we'll implement this in the worker)
  const normalized = JSON.stringify({
    script: key.cadScript,
    params: sortObject(key.params),
    mesher: key.mesher,
  });
  return `cad_${hashString(normalized)}`;
}

function sortObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObject);
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = sortObject(obj[key]);
    return acc;
  }, {} as any);
}

function hashString(str: string): string {
  // Simple hash for cache keys (crypto.subtle.digest in worker)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
