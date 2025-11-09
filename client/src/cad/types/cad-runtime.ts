/**
 * CAD Runtime API - Available inside CADScript execution context
 *
 * This defines the API surface that CADScript authors can use to build models.
 * All operations execute in the OCCT Worker sandbox.
 */

// ===== PRIMITIVES =====

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Vector3D extends Point3D {}

export interface Plane {
  origin: Point3D;
  normal: Vector3D;
}

export interface Transform {
  translate?: Vector3D;
  rotate?: { axis: Vector3D; angle: number };  // Angle in radians
  scale?: number | Vector3D;
  mirror?: Plane;
}

// Represents an OCCT TopoDS_Shape (opaque handle in JS)
export type Shape = any;

export interface PrimitivesAPI {
  // Basic solids
  box(width: number, depth: number, height: number, center?: boolean): Shape;
  sphere(radius: number, center?: Point3D): Shape;
  cylinder(radius: number, height: number, center?: boolean): Shape;
  cone(radius1: number, radius2: number, height: number): Shape;
  torus(majorRadius: number, minorRadius: number): Shape;

  // 2D sketching
  sketch(): SketchAPI;

  // Points, vectors, planes
  point(x: number, y: number, z: number): Point3D;
  vector(x: number, y: number, z: number): Vector3D;
  plane(origin: Point3D, normal: Vector3D): Plane;
}

export interface SketchAPI {
  // Start a 2D profile
  moveTo(x: number, y: number): this;
  lineTo(x: number, y: number): this;
  arcTo(x: number, y: number, radius: number): this;
  circle(x: number, y: number, radius: number): this;
  rectangle(x: number, y: number, width: number, height: number): this;
  polygon(points: Array<[number, number]>): this;

  // Close and convert to Wire
  close(): Shape;
  toWire(): Shape;
}

// ===== OPERATIONS =====

export interface OpsAPI {
  // 3D operations
  extrude(profile: Shape, distance: number, direction?: Vector3D): Shape;
  revolve(profile: Shape, axis: Vector3D, angle: number): Shape;  // Angle in radians
  loft(profiles: Shape[], ruled?: boolean): Shape;
  sweep(profile: Shape, path: Shape): Shape;

  // Modify operations
  fillet(shape: Shape, edges: Shape[], radius: number): Shape;
  chamfer(shape: Shape, edges: Shape[], distance: number): Shape;
  shell(shape: Shape, faces: Shape[], thickness: number, inside?: boolean): Shape;
  offset(shape: Shape, distance: number): Shape;

  // Transform
  transform(shape: Shape, transform: Transform): Shape;
  translate(shape: Shape, vec: Vector3D): Shape;
  rotate(shape: Shape, axis: Vector3D, angle: number): Shape;
  scale(shape: Shape, factor: number | Vector3D): Shape;
  mirror(shape: Shape, plane: Plane): Shape;

  // Arrays
  linearArray(shape: Shape, direction: Vector3D, count: number, spacing: number): Shape;
  circularArray(shape: Shape, axis: Vector3D, count: number): Shape;
}

// ===== BOOLEAN OPERATIONS =====

export interface BoolAPI {
  union(...shapes: Shape[]): Shape;
  subtract(base: Shape, ...tools: Shape[]): Shape;
  intersect(...shapes: Shape[]): Shape;
  cut(base: Shape, tool: Shape): Shape;
}

// ===== QUERIES =====

export interface QueryAPI {
  // Measurements
  volume(shape: Shape): number;
  surfaceArea(shape: Shape): number;
  boundingBox(shape: Shape): { min: Point3D; max: Point3D };
  centerOfMass(shape: Shape): Point3D;

  // Topology queries
  faces(shape: Shape): Shape[];
  edges(shape: Shape): Shape[];
  vertices(shape: Shape): Shape[];

  // Selection helpers
  facesByNormal(shape: Shape, normal: Vector3D, tolerance?: number): Shape[];
  edgesByLength(shape: Shape, minLength: number, maxLength?: number): Shape[];
}

// ===== FEATURE TAGGING =====

export interface FeatureAPI {
  // Tag topology for UI selection/highlighting
  (name: string, shape: Shape): void;

  // Get all tagged features
  all(): Record<string, Shape>;

  // Clear tags
  clear(): void;
}

// ===== BUILD CONTEXT =====

export interface BuildContext {
  primitives: PrimitivesAPI;
  ops: OpsAPI;
  bool: BoolAPI;
  query: QueryAPI;
  feature: FeatureAPI;

  // Constants
  readonly PI: number;
  readonly DEG_TO_RAD: number;
  readonly RAD_TO_DEG: number;

  // Utility
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// ===== CADSCRIPT SIGNATURE =====

export type CADScriptFunction = (
  ctx: BuildContext,
  params: Record<string, any>
) => Promise<Shape> | Shape;

// Example CADScript module structure:
// export default async function build(ctx, p) {
//   const base = ctx.primitives.cylinder(p.diameter / 2, p.height);
//   ctx.feature('main_body', base);
//   return base;
// }
