/**
 * CAD Engine - Public API
 *
 * Main exports for the OpenCascade CAD feature.
 */

// Client SDK
export { CADClient, getCADClient, destroyCADClient, useCADClient } from './client/cad-client';
export type { CADClientConfig } from './client/cad-client';

// Viewer
export { CadViewer, CadScene, CadDemo } from './viewer';
export type { CadViewerProps, CadSceneConfig, MeshData, SectionPlane, Measurement } from './viewer';

// Types
export type {
  WorkerReq,
  WorkerRes,
  BuildReq,
  BuildRes,
  ExportReq,
  ExportRes,
  ImportReq,
  ImportRes,
  ProgressEvent,
  LogEvent,
  WorkerConfig,
} from './types/worker-protocol';

export type {
  ParamSchema,
  Param,
  NumberParam,
  IntegerParam,
  StringParam,
  EnumParam,
  BooleanParam,
  ValidationResult,
  ValidationError,
} from './types/param-schema';

export type {
  PrimitivesAPI,
  SketchAPI,
  OpsAPI,
  BoolAPI,
  QueryAPI,
  FeatureAPI,
  BuildContext,
  Point3D,
  Vector3D,
  Plane,
  Transform,
  Shape,
  CADScriptFunction,
} from './types/cad-runtime';

// Validation
export { validateParams, exampleSchema } from './types/param-schema';

// I/O
export { exportSTEP, exportSTEPText, downloadSTEP } from './io/step-export';
export { exportSTL, exportSTLText, downloadSTL } from './io/stl-export';
export { importSTEP, healShape, analyzeShape } from './io/step-import';
export type { StepExportOptions, StlExportOptions, StepImportOptions, HealingStats } from './io';
