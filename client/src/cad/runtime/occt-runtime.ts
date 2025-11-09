/**
 * OpenCascade Runtime Implementation
 *
 * This module implements the CAD Runtime API using OpenCascade.js (OCCT WASM).
 * It provides a high-level interface for creating and manipulating 3D geometry.
 */

import type {
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
} from '../types/cad-runtime';

// ===== OCCT TYPE MAPPINGS =====

/**
 * OpenCascade.js instance type (will be populated after WASM loads)
 */
export type OCCTInstance = any;

// Internal map to track shapes and their OCCT handles
const shapeRegistry = new WeakMap<object, any>();
let nextShapeId = 0;

/**
 * Wrap an OCCT TopoDS_Shape in a JS object
 */
function wrapShape(occtShape: any): Shape {
  const wrapper = { __shapeId: nextShapeId++ };
  shapeRegistry.set(wrapper, occtShape);
  return wrapper;
}

/**
 * Unwrap a JS Shape to get the underlying OCCT TopoDS_Shape
 */
function unwrapShape(shape: Shape): any {
  return shapeRegistry.get(shape);
}

// ===== PRIMITIVES IMPLEMENTATION =====

export function createPrimitivesAPI(oc: OCCTInstance): PrimitivesAPI {
  return {
    box(width: number, depth: number, height: number, center = false): Shape {
      const x = center ? -width / 2 : 0;
      const y = center ? -depth / 2 : 0;
      const z = center ? -height / 2 : 0;

      const box = new oc.BRepPrimAPI_MakeBox_2(
        new oc.gp_Pnt_3(x, y, z),
        width,
        depth,
        height
      );
      const shape = box.Shape();
      box.delete();
      return wrapShape(shape);
    },

    sphere(radius: number, center?: Point3D): Shape {
      const cx = center?.x ?? 0;
      const cy = center?.y ?? 0;
      const cz = center?.z ?? 0;

      const sphere = new oc.BRepPrimAPI_MakeSphere_2(
        new oc.gp_Pnt_3(cx, cy, cz),
        radius
      );
      const shape = sphere.Shape();
      sphere.delete();
      return wrapShape(shape);
    },

    cylinder(radius: number, height: number, center = false): Shape {
      const z = center ? -height / 2 : 0;

      const axis = new oc.gp_Ax2_2(
        new oc.gp_Pnt_3(0, 0, z),
        new oc.gp_Dir_4(0, 0, 1)
      );
      const cylinder = new oc.BRepPrimAPI_MakeCylinder_2(axis, radius, height);
      const shape = cylinder.Shape();
      cylinder.delete();
      axis.delete();
      return wrapShape(shape);
    },

    cone(radius1: number, radius2: number, height: number): Shape {
      const axis = new oc.gp_Ax2_2(
        new oc.gp_Pnt_3(0, 0, 0),
        new oc.gp_Dir_4(0, 0, 1)
      );
      const cone = new oc.BRepPrimAPI_MakeCone_2(axis, radius1, radius2, height);
      const shape = cone.Shape();
      cone.delete();
      axis.delete();
      return wrapShape(shape);
    },

    torus(majorRadius: number, minorRadius: number): Shape {
      const axis = new oc.gp_Ax2_2(
        new oc.gp_Pnt_3(0, 0, 0),
        new oc.gp_Dir_4(0, 0, 1)
      );
      const torus = new oc.BRepPrimAPI_MakeTorus_2(axis, majorRadius, minorRadius);
      const shape = torus.Shape();
      torus.delete();
      axis.delete();
      return wrapShape(shape);
    },

    sketch(): SketchAPI {
      return createSketchAPI(oc);
    },

    point(x: number, y: number, z: number): Point3D {
      return { x, y, z };
    },

    vector(x: number, y: number, z: number): Vector3D {
      return { x, y, z };
    },

    plane(origin: Point3D, normal: Vector3D): Plane {
      return { origin, normal };
    },
  };
}

// ===== SKETCH API IMPLEMENTATION =====

function createSketchAPI(oc: OCCTInstance): SketchAPI {
  const edges: any[] = [];
  let currentPoint: Point3D = { x: 0, y: 0, z: 0 };

  const api: SketchAPI = {
    moveTo(x: number, y: number): SketchAPI {
      currentPoint = { x, y, z: 0 };
      return api;
    },

    lineTo(x: number, y: number): SketchAPI {
      const p1 = new oc.gp_Pnt_3(currentPoint.x, currentPoint.y, 0);
      const p2 = new oc.gp_Pnt_3(x, y, 0);
      const edge = new oc.BRepBuilderAPI_MakeEdge_3(p1, p2).Edge();
      edges.push(edge);
      p1.delete();
      p2.delete();
      currentPoint = { x, y, z: 0 };
      return api;
    },

    arcTo(x: number, y: number, radius: number): SketchAPI {
      // Simplified arc implementation (tangent arc)
      const p1 = new oc.gp_Pnt_3(currentPoint.x, currentPoint.y, 0);
      const p2 = new oc.gp_Pnt_3(x, y, 0);
      const midX = (currentPoint.x + x) / 2;
      const midY = (currentPoint.y + y) / 2;
      const pMid = new oc.gp_Pnt_3(midX, midY, 0);

      const edge = new oc.BRepBuilderAPI_MakeEdge_4(p1, pMid, p2).Edge();
      edges.push(edge);
      p1.delete();
      p2.delete();
      pMid.delete();
      currentPoint = { x, y, z: 0 };
      return api;
    },

    circle(x: number, y: number, radius: number): SketchAPI {
      const center = new oc.gp_Pnt_3(x, y, 0);
      const normal = new oc.gp_Dir_4(0, 0, 1);
      const axis = new oc.gp_Ax2_2(center, normal);
      const circle = new oc.gp_Circ_2(axis, radius);
      const edge = new oc.BRepBuilderAPI_MakeEdge_8(circle).Edge();
      edges.push(edge);
      center.delete();
      normal.delete();
      axis.delete();
      circle.delete();
      return api;
    },

    rectangle(x: number, y: number, width: number, height: number): SketchAPI {
      api.moveTo(x, y);
      api.lineTo(x + width, y);
      api.lineTo(x + width, y + height);
      api.lineTo(x, y + height);
      api.lineTo(x, y);
      return api;
    },

    polygon(points: Array<[number, number]>): SketchAPI {
      if (points.length < 3) return api;
      api.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        api.lineTo(points[i][0], points[i][1]);
      }
      api.lineTo(points[0][0], points[0][1]); // Close
      return api;
    },

    close(): Shape {
      return api.toWire();
    },

    toWire(): Shape {
      const wire = new oc.BRepBuilderAPI_MakeWire_1();
      for (const edge of edges) {
        wire.Add_1(edge);
      }
      const wireShape = wire.Wire();
      wire.delete();
      edges.forEach(e => e.delete());
      edges.length = 0;
      return wrapShape(wireShape);
    },
  };

  return api;
}

// ===== OPERATIONS IMPLEMENTATION =====

export function createOpsAPI(oc: OCCTInstance): OpsAPI {
  return {
    extrude(profile: Shape, distance: number, direction?: Vector3D): Shape {
      const occtProfile = unwrapShape(profile);

      const dir = direction
        ? new oc.gp_Vec_4(direction.x, direction.y, direction.z)
        : new oc.gp_Vec_4(0, 0, distance);

      const prism = new oc.BRepPrimAPI_MakePrism_1(occtProfile, dir, false, true);
      const shape = prism.Shape();
      prism.delete();
      dir.delete();
      return wrapShape(shape);
    },

    revolve(profile: Shape, axis: Vector3D, angle: number): Shape {
      const occtProfile = unwrapShape(profile);

      const axisDir = new oc.gp_Dir_4(axis.x, axis.y, axis.z);
      const axisOrigin = new oc.gp_Pnt_3(0, 0, 0);
      const ax1 = new oc.gp_Ax1_2(axisOrigin, axisDir);

      const revolve = new oc.BRepPrimAPI_MakeRevol_1(occtProfile, ax1, angle, false);
      const shape = revolve.Shape();
      revolve.delete();
      ax1.delete();
      axisDir.delete();
      axisOrigin.delete();
      return wrapShape(shape);
    },

    loft(profiles: Shape[], ruled = false): Shape {
      const loft = new oc.BRepOffsetAPI_ThruSections(true, ruled);

      for (const profile of profiles) {
        const wire = unwrapShape(profile);
        loft.AddWire(wire);
      }

      loft.Build(new oc.Message_ProgressRange_1());
      const shape = loft.Shape();
      loft.delete();
      return wrapShape(shape);
    },

    sweep(profile: Shape, path: Shape): Shape {
      const occtProfile = unwrapShape(profile);
      const occtPath = unwrapShape(path);

      const sweep = new oc.BRepOffsetAPI_MakePipe(occtPath, occtProfile);
      const shape = sweep.Shape();
      sweep.delete();
      return wrapShape(shape);
    },

    fillet(shape: Shape, edges: Shape[], radius: number): Shape {
      const occtShape = unwrapShape(shape);
      const fillet = new oc.BRepFilletAPI_MakeFillet(occtShape, oc.ChFi3d_FilletShape.ChFi3d_Rational);

      for (const edge of edges) {
        const occtEdge = unwrapShape(edge);
        fillet.Add_2(radius, occtEdge);
      }

      const result = fillet.Shape();
      fillet.delete();
      return wrapShape(result);
    },

    chamfer(shape: Shape, edges: Shape[], distance: number): Shape {
      const occtShape = unwrapShape(shape);
      const chamfer = new oc.BRepFilletAPI_MakeChamfer(occtShape);

      for (const edge of edges) {
        const occtEdge = unwrapShape(edge);
        chamfer.Add_2(distance, occtEdge);
      }

      const result = chamfer.Shape();
      chamfer.delete();
      return wrapShape(result);
    },

    shell(shape: Shape, faces: Shape[], thickness: number, inside = false): Shape {
      const occtShape = unwrapShape(shape);
      const shell = new oc.BRepOffsetAPI_MakeThickSolid();

      const facesToRemove = new oc.TopTools_ListOfShape_1();
      for (const face of faces) {
        facesToRemove.Append_1(unwrapShape(face));
      }

      shell.MakeThickSolidByJoin(
        occtShape,
        facesToRemove,
        inside ? -thickness : thickness,
        1e-6
      );

      const result = shell.Shape();
      shell.delete();
      facesToRemove.delete();
      return wrapShape(result);
    },

    offset(shape: Shape, distance: number): Shape {
      const occtShape = unwrapShape(shape);
      const offset = new oc.BRepOffsetAPI_MakeOffset_2(
        occtShape,
        distance,
        1e-6,
        oc.BRepOffset_Mode.BRepOffset_Skin,
        false,
        false,
        oc.GeomAbs_JoinType.GeomAbs_Arc,
        false
      );
      const result = offset.Shape();
      offset.delete();
      return wrapShape(result);
    },

    transform(shape: Shape, transform: Transform): Shape {
      let occtShape = unwrapShape(shape);

      if (transform.translate) {
        const translation = new oc.gp_Trsf_1();
        translation.SetTranslation_1(
          new oc.gp_Vec_4(transform.translate.x, transform.translate.y, transform.translate.z)
        );
        const transformed = new oc.BRepBuilderAPI_Transform_2(occtShape, translation, false);
        occtShape = transformed.Shape();
        transformed.delete();
        translation.delete();
      }

      if (transform.rotate) {
        const rotation = new oc.gp_Trsf_1();
        const axis = new oc.gp_Ax1_2(
          new oc.gp_Pnt_3(0, 0, 0),
          new oc.gp_Dir_4(transform.rotate.axis.x, transform.rotate.axis.y, transform.rotate.axis.z)
        );
        rotation.SetRotation_1(axis, transform.rotate.angle);
        const transformed = new oc.BRepBuilderAPI_Transform_2(occtShape, rotation, false);
        occtShape = transformed.Shape();
        transformed.delete();
        rotation.delete();
        axis.delete();
      }

      if (transform.scale) {
        const scaling = new oc.gp_Trsf_1();
        const scaleFactor = typeof transform.scale === 'number'
          ? transform.scale
          : Math.cbrt(transform.scale.x * transform.scale.y * transform.scale.z);
        scaling.SetScale(new oc.gp_Pnt_3(0, 0, 0), scaleFactor);
        const transformed = new oc.BRepBuilderAPI_Transform_2(occtShape, scaling, false);
        occtShape = transformed.Shape();
        transformed.delete();
        scaling.delete();
      }

      if (transform.mirror) {
        const mirroring = new oc.gp_Trsf_1();
        const plane = new oc.gp_Ax2_2(
          new oc.gp_Pnt_3(transform.mirror.origin.x, transform.mirror.origin.y, transform.mirror.origin.z),
          new oc.gp_Dir_4(transform.mirror.normal.x, transform.mirror.normal.y, transform.mirror.normal.z)
        );
        mirroring.SetMirror_2(plane);
        const transformed = new oc.BRepBuilderAPI_Transform_2(occtShape, mirroring, false);
        occtShape = transformed.Shape();
        transformed.delete();
        mirroring.delete();
        plane.delete();
      }

      return wrapShape(occtShape);
    },

    translate(shape: Shape, vec: Vector3D): Shape {
      return this.transform(shape, { translate: vec });
    },

    rotate(shape: Shape, axis: Vector3D, angle: number): Shape {
      return this.transform(shape, { rotate: { axis, angle } });
    },

    scale(shape: Shape, factor: number | Vector3D): Shape {
      return this.transform(shape, { scale: factor });
    },

    mirror(shape: Shape, plane: Plane): Shape {
      return this.transform(shape, { mirror: plane });
    },

    linearArray(shape: Shape, direction: Vector3D, count: number, spacing: number): Shape {
      const shapes: any[] = [];

      for (let i = 0; i < count; i++) {
        const vec = {
          x: direction.x * spacing * i,
          y: direction.y * spacing * i,
          z: direction.z * spacing * i,
        };
        const translated = this.translate(shape, vec);
        shapes.push(unwrapShape(translated));
      }

      const compound = new oc.TopoDS_Compound();
      const builder = new oc.BRep_Builder();
      builder.MakeCompound(compound);

      for (const s of shapes) {
        builder.Add(compound, s);
      }

      builder.delete();
      return wrapShape(compound);
    },

    circularArray(shape: Shape, axis: Vector3D, count: number): Shape {
      const shapes: any[] = [];
      const angleStep = (2 * Math.PI) / count;

      for (let i = 0; i < count; i++) {
        const rotated = this.rotate(shape, axis, angleStep * i);
        shapes.push(unwrapShape(rotated));
      }

      const compound = new oc.TopoDS_Compound();
      const builder = new oc.BRep_Builder();
      builder.MakeCompound(compound);

      for (const s of shapes) {
        builder.Add(compound, s);
      }

      builder.delete();
      return wrapShape(compound);
    },
  };
}

// ===== BOOLEAN OPERATIONS IMPLEMENTATION =====

export function createBoolAPI(oc: OCCTInstance): BoolAPI {
  return {
    union(...shapes: Shape[]): Shape {
      if (shapes.length === 0) throw new Error('union requires at least 1 shape');
      if (shapes.length === 1) return shapes[0];

      let result = unwrapShape(shapes[0]);

      for (let i = 1; i < shapes.length; i++) {
        const fuse = new oc.BRepAlgoAPI_Fuse_3(result, unwrapShape(shapes[i]), new oc.Message_ProgressRange_1());
        result = fuse.Shape();
        fuse.delete();
      }

      return wrapShape(result);
    },

    subtract(base: Shape, ...tools: Shape[]): Shape {
      let result = unwrapShape(base);

      for (const tool of tools) {
        const cut = new oc.BRepAlgoAPI_Cut_3(result, unwrapShape(tool), new oc.Message_ProgressRange_1());
        result = cut.Shape();
        cut.delete();
      }

      return wrapShape(result);
    },

    intersect(...shapes: Shape[]): Shape {
      if (shapes.length === 0) throw new Error('intersect requires at least 1 shape');
      if (shapes.length === 1) return shapes[0];

      let result = unwrapShape(shapes[0]);

      for (let i = 1; i < shapes.length; i++) {
        const common = new oc.BRepAlgoAPI_Common_3(result, unwrapShape(shapes[i]), new oc.Message_ProgressRange_1());
        result = common.Shape();
        common.delete();
      }

      return wrapShape(result);
    },

    cut(base: Shape, tool: Shape): Shape {
      return this.subtract(base, tool);
    },
  };
}

// ===== QUERY OPERATIONS IMPLEMENTATION =====

export function createQueryAPI(oc: OCCTInstance): QueryAPI {
  return {
    volume(shape: Shape): number {
      const occtShape = unwrapShape(shape);
      const props = new oc.GProp_GProps_1();
      oc.BRepGProp.VolumeProperties_1(occtShape, props, false, false, false);
      const vol = props.Mass();
      props.delete();
      return vol;
    },

    surfaceArea(shape: Shape): number {
      const occtShape = unwrapShape(shape);
      const props = new oc.GProp_GProps_1();
      oc.BRepGProp.SurfaceProperties_1(occtShape, props, false, false);
      const area = props.Mass();
      props.delete();
      return area;
    },

    boundingBox(shape: Shape): { min: Point3D; max: Point3D } {
      const occtShape = unwrapShape(shape);
      const bbox = new oc.Bnd_Box_1();
      oc.BRepBndLib.Add(occtShape, bbox, false);

      const min = { x: 0, y: 0, z: 0 };
      const max = { x: 0, y: 0, z: 0 };

      const pMin = new oc.gp_Pnt_1();
      const pMax = new oc.gp_Pnt_1();
      bbox.Get(pMin, pMax);

      min.x = pMin.X();
      min.y = pMin.Y();
      min.z = pMin.Z();
      max.x = pMax.X();
      max.y = pMax.Y();
      max.z = pMax.Z();

      bbox.delete();
      pMin.delete();
      pMax.delete();

      return { min, max };
    },

    centerOfMass(shape: Shape): Point3D {
      const occtShape = unwrapShape(shape);
      const props = new oc.GProp_GProps_1();
      oc.BRepGProp.VolumeProperties_1(occtShape, props, false, false, false);
      const center = props.CentreOfMass();
      const result = { x: center.X(), y: center.Y(), z: center.Z() };
      props.delete();
      center.delete();
      return result;
    },

    faces(shape: Shape): Shape[] {
      const occtShape = unwrapShape(shape);
      const faces: Shape[] = [];

      const explorer = new oc.TopExp_Explorer_2(
        occtShape,
        oc.TopAbs_ShapeEnum.TopAbs_FACE as any,
        oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any
      );

      while (explorer.More()) {
        const face = oc.TopoDS.Face_1(explorer.Current());
        faces.push(wrapShape(face));
        explorer.Next();
      }

      explorer.delete();
      return faces;
    },

    edges(shape: Shape): Shape[] {
      const occtShape = unwrapShape(shape);
      const edges: Shape[] = [];

      const explorer = new oc.TopExp_Explorer_2(
        occtShape,
        oc.TopAbs_ShapeEnum.TopAbs_EDGE as any,
        oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any
      );

      while (explorer.More()) {
        const edge = oc.TopoDS.Edge_1(explorer.Current());
        edges.push(wrapShape(edge));
        explorer.Next();
      }

      explorer.delete();
      return edges;
    },

    vertices(shape: Shape): Shape[] {
      const occtShape = unwrapShape(shape);
      const vertices: Shape[] = [];

      const explorer = new oc.TopExp_Explorer_2(
        occtShape,
        oc.TopAbs_ShapeEnum.TopAbs_VERTEX as any,
        oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any
      );

      while (explorer.More()) {
        const vertex = oc.TopoDS.Vertex_1(explorer.Current());
        vertices.push(wrapShape(vertex));
        explorer.Next();
      }

      explorer.delete();
      return vertices;
    },

    facesByNormal(shape: Shape, normal: Vector3D, tolerance = 0.1): Shape[] {
      const faces = this.faces(shape);
      const filtered: Shape[] = [];

      const targetDir = new oc.gp_Dir_4(normal.x, normal.y, normal.z);

      for (const face of faces) {
        const occtFace = unwrapShape(face);
        const surface = oc.BRep_Tool.Surface_2(occtFace);

        // Get normal at center of face (simplified)
        const uMin = { current: 0 }, uMax = { current: 0 }, vMin = { current: 0 }, vMax = { current: 0 };
        oc.BRepTools.UVBounds_1(occtFace, uMin, uMax, vMin, vMax);

        const uMid = (uMin.current + uMax.current) / 2;
        const vMid = (vMin.current + vMax.current) / 2;

        const point = new oc.gp_Pnt_1();
        const normal2 = new oc.gp_Vec_1();
        surface.D1(uMid, vMid, point, normal2, new oc.gp_Vec_1());

        const faceDir = new oc.gp_Dir_3(normal2);
        const angle = Math.abs(faceDir.Angle(targetDir));

        if (angle < tolerance) {
          filtered.push(face);
        }

        point.delete();
        normal2.delete();
        faceDir.delete();
      }

      targetDir.delete();
      return filtered;
    },

    edgesByLength(shape: Shape, minLength: number, maxLength?: number): Shape[] {
      const edges = this.edges(shape);
      const filtered: Shape[] = [];

      for (const edge of edges) {
        const occtEdge = unwrapShape(edge);
        const props = new oc.GProp_GProps_1();
        oc.BRepGProp.LinearProperties(occtEdge, props, false, false);
        const length = props.Mass();
        props.delete();

        if (length >= minLength && (maxLength === undefined || length <= maxLength)) {
          filtered.push(edge);
        }
      }

      return filtered;
    },
  };
}

// ===== MESHING =====

export interface MeshResult {
  vertices: Float32Array;  // [x, y, z, nx, ny, nz, ...]
  indices: Uint32Array;
  triCount: number;
  edges?: Float32Array;    // [x1, y1, z1, x2, y2, z2, ...]
}

export function meshShape(
  oc: OCCTInstance,
  shape: Shape,
  linearDeflection = 0.1,
  angularDeflection = 0.5
): MeshResult {
  const occtShape = unwrapShape(shape);

  // Mesh the shape
  const incrementalMesh = new oc.BRepMesh_IncrementalMesh_2(
    occtShape,
    linearDeflection,
    false,
    angularDeflection,
    true
  );
  incrementalMesh.Perform(new oc.Message_ProgressRange_1());
  incrementalMesh.delete();

  // Extract mesh data
  const vertices: number[] = [];
  const indices: number[] = [];
  const edgePoints: number[] = [];

  let vertexIndex = 0;
  const vertexMap = new Map<string, number>();

  // Extract faces
  const faceExplorer = new oc.TopExp_Explorer_2(
    occtShape,
    oc.TopAbs_ShapeEnum.TopAbs_FACE as any,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any
  );

  while (faceExplorer.More()) {
    const face = oc.TopoDS.Face_1(faceExplorer.Current());
    const location = new oc.TopLoc_Location_1();
    const triangulation = oc.BRep_Tool.Triangulation(face, location);

    if (!triangulation.IsNull()) {
      const transform = location.Transformation();
      const nodeCount = triangulation.get().NbNodes();
      const triCount = triangulation.get().NbTriangles();

      // Get face normal for consistent vertex normals
      const surface = oc.BRep_Tool.Surface_2(face);

      // Extract vertices
      for (let i = 1; i <= nodeCount; i++) {
        const node = triangulation.get().Node(i);
        const transformedNode = node.Transformed(transform);

        const x = transformedNode.X();
        const y = transformedNode.Y();
        const z = transformedNode.Z();

        // Compute normal (simplified - using face normal)
        const uv = triangulation.get().UVNode(i);
        const point = new oc.gp_Pnt_1();
        const d1u = new oc.gp_Vec_1();
        const d1v = new oc.gp_Vec_1();
        surface.D1(uv.X(), uv.Y(), point, d1u, d1v);

        const normal = d1u.Crossed(d1v);
        normal.Normalize();

        const nx = normal.X();
        const ny = normal.Y();
        const nz = normal.Z();

        const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
        if (!vertexMap.has(key)) {
          vertexMap.set(key, vertexIndex++);
          vertices.push(x, y, z, nx, ny, nz);
        }

        point.delete();
        d1u.delete();
        d1v.delete();
        normal.delete();
        uv.delete();
        node.delete();
        transformedNode.delete();
      }

      // Extract triangles
      const baseIndex = vertexMap.size - nodeCount;
      for (let i = 1; i <= triCount; i++) {
        const triangle = triangulation.get().Triangle(i);
        let i1 = triangle.Value(1) - 1;
        let i2 = triangle.Value(2) - 1;
        let i3 = triangle.Value(3) - 1;

        indices.push(baseIndex + i1, baseIndex + i2, baseIndex + i3);
        triangle.delete();
      }

      transform.delete();
    }

    location.delete();
    faceExplorer.Next();
  }

  faceExplorer.delete();

  // Extract edges
  const edgeExplorer = new oc.TopExp_Explorer_2(
    occtShape,
    oc.TopAbs_ShapeEnum.TopAbs_EDGE as any,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any
  );

  while (edgeExplorer.More()) {
    const edge = oc.TopoDS.Edge_1(edgeExplorer.Current());
    const location = new oc.TopLoc_Location_1();
    const polygon = oc.BRep_Tool.PolygonOnTriangulation_1(edge, location);

    if (!polygon.IsNull()) {
      const transform = location.Transformation();
      const nodeCount = polygon.get().NbNodes();

      for (let i = 1; i < nodeCount; i++) {
        const idx1 = polygon.get().Value(i);
        const idx2 = polygon.get().Value(i + 1);

        // Get vertices from triangulation
        // (This is simplified - in production we'd track the triangulation reference)
        edgePoints.push(0, 0, 0, 0, 0, 0); // Placeholder
      }

      transform.delete();
    }

    location.delete();
    edgeExplorer.Next();
  }

  edgeExplorer.delete();

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(indices),
    triCount: indices.length / 3,
    edges: edgePoints.length > 0 ? new Float32Array(edgePoints) : undefined,
  };
}
