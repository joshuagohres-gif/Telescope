# CAD Feature API Documentation

Complete API reference for the Telescope CAD feature.

## Table of Contents

- [CAD Client](#cad-client)
- [Template System](#template-system)
- [Parameter Schema](#parameter-schema)
- [Worker Protocol](#worker-protocol)
- [Telemetry](#telemetry)
- [Cache System](#cache-system)

---

## CAD Client

### OptimizedCADClient

Enhanced CAD client with caching, worker pooling, and telemetry.

#### Constructor

```typescript
const client = new OptimizedCADClient({
  enableCache: true,
  enableWorkerPool: true,
  enableTelemetry: true,
  enableLogging: true,
});
```

**Config Options:**
- `enableCache` (boolean): Enable mesh caching with IndexedDB
- `enableWorkerPool` (boolean): Use worker pool for parallel processing
- `enableTelemetry` (boolean): Track performance metrics
- `enableLogging` (boolean): Log operations to console

#### Methods

##### `init(): Promise<void>`

Initialize the CAD client and load OpenCascade WASM.

```typescript
await client.init();
```

##### `buildModel(cadScript, params, mesher?): Promise<BuildRes>`

Build a CAD model from CADScript and parameters.

```typescript
const result = await client.buildModel(
  cadScript,
  { diameter: 50, height: 100 },
  {
    linearDeflection: 0.1,
    angularDeflection: 0.5,
  }
);

// Result structure
interface BuildRes {
  ok: boolean;
  shapeId: string;
  triCount: number;
  mesh: ArrayBuffer;        // Interleaved vertex data
  edges?: ArrayBuffer;      // Edge geometry
  topologyMap: Record<string, string[]>;
  bbox: { min: [number, number, number]; max: [number, number, number] };
  volume?: number;
  surfaceArea?: number;
}
```

**Parameters:**
- `cadScript` (string): JavaScript code defining the CAD model
- `params` (Record<string, any>): Parameter values
- `mesher` (object, optional): Meshing configuration
  - `linearDeflection` (number): Linear deflection tolerance
  - `angularDeflection` (number): Angular deflection tolerance

**Returns:** Promise<BuildRes> - Build result with mesh data

##### `exportSTEP(shapeId, options?): Promise<ArrayBuffer>`

Export a model to STEP format.

```typescript
const stepBytes = await client.exportSTEP(shapeId, {
  schema: 'AP214' // or 'AP242'
});

// Save to file
const blob = new Blob([stepBytes], { type: 'application/step' });
const url = URL.createObjectURL(blob);
```

##### `exportSTL(shapeId, options?): Promise<ArrayBuffer>`

Export a model to STL format.

```typescript
const stlBytes = await client.exportSTL(shapeId, {
  binary: true,
  linearDeflection: 0.1,
  angularDeflection: 0.5,
});
```

##### `importSTEP(stepBytes, options?): Promise<{shapeId, stats}>`

Import a STEP file with optional healing.

```typescript
const result = await client.importSTEP(stepBytes, {
  heal: {
    sewing: true,
    fixShape: true,
  }
});
```

##### `getCacheStats(): Promise<CacheStats>`

Get cache statistics.

```typescript
const stats = await client.getCacheStats();
// { entryCount: 10, totalSizeMB: 5.2, oldestEntry: timestamp, newestEntry: timestamp }
```

##### `clearCache(): Promise<void>`

Clear the mesh cache.

```typescript
await client.clearCache();
```

##### `getTelemetrySummary(): TelemetrySummary | null`

Get telemetry summary.

```typescript
const summary = client.getTelemetrySummary();
// { totalBuilds, averageBuildTime, cacheHitRate, averageFPS, totalErrors, ... }
```

##### `terminate(): void`

Terminate the client and cleanup resources.

```typescript
client.terminate();
```

---

## Template System

### Template Registry

Access pre-built CAD templates.

#### Functions

##### `getTemplate(id: string): TemplateInfo | undefined`

Get a template by ID.

```typescript
import { getTemplate } from '@/cad/templates';

const template = getTemplate('tube-clamp');
```

##### `ALL_TEMPLATES: TemplateInfo[]`

Array of all available templates.

```typescript
import { ALL_TEMPLATES } from '@/cad/templates';

ALL_TEMPLATES.forEach(template => {
  console.log(template.name, template.description);
});
```

##### `findTemplatesByTag(tag: string): TemplateInfo[]`

Find templates with a specific tag.

```typescript
const mountingTemplates = findTemplatesByTag('mounting');
```

##### `searchTemplates(query: string): TemplateInfo[]`

Search templates by name, description, or tags.

```typescript
const results = searchTemplates('finder');
```

##### `getAllTags(): string[]`

Get all unique tags across templates.

```typescript
const tags = getAllTags();
// ['mounting', 'clamp', 'finder', 'spider', ...]
```

#### TemplateInfo Structure

```typescript
interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  tags: string[];
  paramSchema: ParamSchema;
  cadScript: string;
  suggestedParams: Record<string, any>;
  thumbnailUrl?: string;
}
```

---

## Parameter Schema

### ParamSchema

Defines parameters and validation rules for CAD models.

#### Structure

```typescript
interface ParamSchema {
  version: string;
  name: string;
  description?: string;
  author?: string;
  tags?: string[];
  params: Record<string, Param>;
  constraints?: Constraint[];
}
```

#### Parameter Types

##### Number Parameter

```typescript
{
  type: 'number',
  label: 'Diameter',
  description?: 'Tube inner diameter',
  default: 50,
  min: 10,
  max: 200,
  step?: 0.1,
  units?: 'mm',
  group?: 'Dimensions',
}
```

##### Integer Parameter

```typescript
{
  type: 'integer',
  label: 'Hole Count',
  default: 4,
  min: 2,
  max: 12,
}
```

##### String Parameter

```typescript
{
  type: 'string',
  label: 'Part Name',
  default: 'Part',
  pattern?: '^[a-zA-Z0-9_-]+$',
  minLength?: 1,
  maxLength?: 50,
}
```

##### Boolean Parameter

```typescript
{
  type: 'boolean',
  label: 'Include Keyway',
  default: true,
  trueLabel?: 'Enabled',
  falseLabel?: 'Disabled',
}
```

##### Enum Parameter

```typescript
{
  type: 'enum',
  label: 'Style',
  default: 'losmandy',
  options: [
    { value: 'losmandy', label: 'Losmandy (75mm)' },
    { value: 'vixen', label: 'Vixen (44mm)' },
  ],
}
```

#### Constraints

Constraints are JavaScript expressions evaluated against parameter values.

```typescript
constraints: [
  {
    expression: 'height > diameter',
    message: 'Height must be greater than diameter',
  },
  {
    expression: 'wallThickness < diameter / 4',
    message: 'Wall too thick for diameter',
  },
]
```

#### Validation

```typescript
import { validateParams } from '@/cad/types/param-schema';

const result = validateParams(paramSchema, params);

if (!result.valid) {
  console.error('Validation errors:', result.errors);
  console.error('Constraint violations:', result.constraintViolations);
}
```

---

## Worker Protocol

### Message Types

#### Build Request

```typescript
interface BuildReq {
  type: 'buildModel';
  cadScript: string;
  params: Record<string, any>;
  mesher?: {
    linearDeflection?: number;
    angularDeflection?: number;
  };
}
```

#### Export Request

```typescript
interface ExportReq {
  type: 'exportSTEP' | 'exportSTL';
  shapeId: string;
  options?: {
    schema?: 'AP214' | 'AP242';
    binary?: boolean;
  };
}
```

#### Import Request

```typescript
interface ImportReq {
  type: 'importSTEP';
  stepBytes: ArrayBuffer;
  options?: {
    heal?: {
      sewing?: boolean;
      fixShape?: boolean;
      removeSmallEdges?: boolean;
      tolerance?: number;
    };
  };
}
```

### Response Format

All responses follow this structure:

```typescript
type WorkerRes =
  | Ok<T>
  | Err;

interface Ok<T> {
  type: string;
  ok: true;
  ...T  // Response-specific data
}

interface Err {
  type: string;
  ok: false;
  error: string;
}
```

---

## Telemetry

### CADTelemetry

Performance monitoring and metrics collection.

#### Methods

##### `recordBuild(metrics: BuildMetrics): void`

Record a build operation.

```typescript
telemetry.recordBuild({
  cadScript: '...',
  paramCount: 5,
  buildDuration: 150,
  triCount: 5000,
  volume: 100.5,
  cacheHit: false,
});
```

##### `recordError(metrics: ErrorMetrics): void`

Record an error.

```typescript
telemetry.recordError({
  errorType: 'build',
  message: 'Invalid parameter',
  context: { param: 'diameter', value: -10 },
});
```

##### `getSummary(): TelemetrySummary`

Get aggregated metrics.

```typescript
const summary = telemetry.getSummary();
console.log('Cache hit rate:', summary.cacheHitRate);
console.log('Average build time:', summary.averageBuildTime);
```

##### `exportJSON(): string`

Export all metrics as JSON.

```typescript
const json = telemetry.exportJSON();
const blob = new Blob([json], { type: 'application/json' });
```

---

## Cache System

### MeshCache

IndexedDB-based caching for built meshes.

#### Methods

##### `get(cadScript, params): Promise<MeshCacheEntry | undefined>`

Get cached mesh data.

```typescript
const cached = await cache.get(cadScript, params);
if (cached) {
  // Use cached.meshData, cached.metadata
}
```

##### `set(cadScript, params, meshData, metadata, edges?): Promise<void>`

Store mesh in cache.

```typescript
await cache.set(
  cadScript,
  params,
  meshBuffer,
  { triCount: 1000, volume: 50.5 },
  edgesBuffer
);
```

##### `clear(): Promise<void>`

Clear all cached data.

```typescript
await cache.clear();
```

##### `getStats(): Promise<CacheStats>`

Get cache statistics.

```typescript
const stats = await cache.getStats();
console.log(`Cache: ${stats.entryCount} entries, ${stats.totalSizeMB} MB`);
```

---

## CADScript Reference

### Build Context API

The `ctx` object provided to CADScript functions.

#### Primitives

```javascript
const box = ctx.primitives.box(width, depth, height, center);
const sphere = ctx.primitives.sphere(radius, center);
const cylinder = ctx.primitives.cylinder(radius, height, center);
const cone = ctx.primitives.cone(baseRadius, topRadius, height, center);
const torus = ctx.primitives.torus(majorRadius, minorRadius);
```

#### Operations

```javascript
const translated = ctx.ops.translate(shape, { x: 10, y: 0, z: 5 });
const rotated = ctx.ops.rotate(shape, { x: 0, y: 0, z: 1 }, angle);
const scaled = ctx.ops.scale(shape, { x: 2, y: 2, z: 1 });
const mirrored = ctx.ops.mirror(shape, { x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
const array = ctx.ops.linearArray(shape, { x: 10, y: 0, z: 0 }, count);
const circArray = ctx.ops.circularArray(shape, { x: 0, y: 0, z: 1 }, count);
```

#### Boolean Operations

```javascript
const union = ctx.bool.union(shape1, shape2, shape3);
const subtraction = ctx.bool.subtract(base, tool1, tool2);
const intersection = ctx.bool.intersect(shape1, shape2);
```

#### Queries

```javascript
const volume = ctx.query.volume(shape);
const surfaceArea = ctx.query.surfaceArea(shape);
const bbox = ctx.query.boundingBox(shape);
const centerOfMass = ctx.query.centerOfMass(shape);
```

#### Logging

```javascript
ctx.log('Creating base cylinder...');
ctx.log(`Volume: ${volume.toFixed(2)} mm³`);
```

#### Constants

```javascript
ctx.PI  // Math.PI
```

---

## Error Handling

All async operations return results or throw errors:

```typescript
try {
  const result = await client.buildModel(cadScript, params);

  if (!result.ok) {
    console.error('Build failed:', result.error);
  } else {
    // Use result.mesh, result.volume, etc.
  }
} catch (error) {
  console.error('Client error:', error);
}
```

---

## Performance Tips

1. **Enable Caching**: Keep `enableCache: true` to avoid recomputing identical models
2. **Use Worker Pool**: Enable `enableWorkerPool: true` for parallel processing
3. **Adjust Mesh Quality**: Lower `linearDeflection` and `angularDeflection` for distant views
4. **Monitor Telemetry**: Use telemetry dashboard to identify bottlenecks
5. **Batch Operations**: Build multiple models concurrently when possible

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 15+

Requires:
- WebAssembly support
- Web Workers
- IndexedDB (for caching)
- ES2020+ features
