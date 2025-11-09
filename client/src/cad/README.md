# CAD Engine - OpenCascade WASM Integration

This directory contains the CAD modeling engine for the Telescope Design System, powered by OpenCascade.js (OCCT WASM).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Thread (React)                     │
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │  CAD Client  │◄────────┤  Components  │                  │
│  │    (SDK)     │         │   (Viewer)   │                  │
│  └──────┬───────┘         └──────────────┘                  │
│         │                                                     │
│         │ postMessage                                        │
│         ▼                                                     │
│  ┌─────────────────────────────────────────────────┐        │
│  │              Web Worker (Sandboxed)              │        │
│  │                                                   │        │
│  │  ┌─────────────┐      ┌──────────────────┐     │        │
│  │  │ OCCT WASM   │◄─────┤  CAD Runtime API │     │        │
│  │  │ (opencascade│      │  (BuildContext)  │     │        │
│  │  │    .js)     │      └──────────────────┘     │        │
│  │  └─────────────┘               │                │        │
│  │         │                       │                │        │
│  │         │                       ▼                │        │
│  │         │              ┌──────────────────┐     │        │
│  │         │              │    CADScript     │     │        │
│  │         │              │  (User Code)     │     │        │
│  │         │              └──────────────────┘     │        │
│  │         │                                        │        │
│  │         ▼                                        │        │
│  │  ┌─────────────┐                                │        │
│  │  │  Mesher +   │                                │        │
│  │  │  Exporter   │                                │        │
│  │  └─────────────┘                                │        │
│  └─────────────────────────────────────────────────┘        │
│                          │                                    │
│                          │ ArrayBuffer (mesh)                │
│                          ▼                                    │
│                  ┌──────────────┐                            │
│                  │  Three.js    │                            │
│                  │  Viewer      │                            │
│                  └──────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
client/src/cad/
├── README.md                    # This file
├── types/
│   ├── worker-protocol.ts       # Message protocol for Worker communication
│   ├── param-schema.ts          # JSON schema for parametric models
│   └── cad-runtime.ts           # CAD API surface (BuildContext)
├── workers/
│   └── occt.worker.ts           # OCCT WASM Worker (sandboxed execution)
├── client/
│   └── cad-client.ts            # Client SDK for main thread
├── runtime/
│   └── (T2) - CAD Runtime implementation
├── viewer/
│   └── (T3) - Three.js viewer components
├── io/
│   └── (T4) - STEP/STL import/export
├── templates/
│   └── (T5) - 5 example CAD templates
└── tests/
    └── (T7) - Unit and integration tests
```

## OpenCascade WASM Decision

### Why OpenCascade?

OpenCascade Technology (OCCT) is the industry-standard CAD kernel used in:
- FreeCAD
- Salome
- CadQuery
- Many commercial CAD systems

**Advantages:**
- ✅ Full BREP (Boundary Representation) solid modeling
- ✅ Supports STEP, IGES, STL import/export (AP214, AP242)
- ✅ Robust boolean operations (union, subtract, intersect)
- ✅ Comprehensive geometry operations (fillet, chamfer, loft, sweep)
- ✅ Topology queries (faces, edges, vertices)
- ✅ WASM build available via `opencascade.js` (npm)
- ✅ LGPL 2.1 license (permissive for commercial use)

**Tradeoffs:**
- ⚠️ Large bundle size (~8-12 MB WASM, gzipped)
- ⚠️ Memory intensive (recommend 1.2 GB limit)
- ⚠️ C++ API requires careful binding in WASM

### WASM Build Source

We use **opencascade.js** from npm/CDN:

```typescript
// Package: opencascade.js v2.0.0+
// CDN: https://cdn.jsdelivr.net/npm/opencascade.js@2.0.0/dist/opencascade.wasm.wasm
// License: LGPL 2.1
```

**Installation:**
```bash
npm install opencascade.js
```

**Loading in Worker:**
```typescript
import initOCC from 'opencascade.js';

const occt = await initOCC({
  locateFile: (path) => {
    if (path.endsWith('.wasm')) {
      return 'https://cdn.jsdelivr.net/npm/opencascade.js@2.0.0/dist/opencascade.wasm.wasm';
    }
    return path;
  },
  TOTAL_MEMORY: 1200 * 1024 * 1024, // 1.2 GB
});
```

## CADScript Format

CADScript is an **ES module** executed in the Worker sandbox. It receives a `BuildContext` API and user parameters, then returns a `Shape`.

**Example:**
```typescript
export default async function build(ctx, params) {
  const { primitives, ops, bool, feature } = ctx;

  // Create base cylinder
  const base = primitives.cylinder(
    params.diameter / 2,
    params.height
  );

  // Create mounting holes
  const hole = primitives.cylinder(
    params.boltDiameter / 2,
    params.height * 1.1
  );

  const holes = ops.circularArray(
    hole,
    { x: 0, y: 0, z: 1 },
    params.boltHoles
  );

  // Boolean subtract
  const result = bool.subtract(base, ...holes);

  // Tag for UI
  feature('main_body', result);

  return result;
}
```

**No `eval()` outside Worker sandbox** - Scripts are executed as Functions within the Worker context only, never in the main thread.

## ParamSchema Format

Parameters are defined using a **JSON schema** that describes types, ranges, units, and constraints.

**Example:**
```typescript
{
  "version": "1.0",
  "name": "Telescope Tube Clamp",
  "params": {
    "tubeDiameter": {
      "type": "number",
      "label": "Tube Diameter",
      "default": 200,
      "min": 50,
      "max": 500,
      "units": "mm"
    },
    "boltHoles": {
      "type": "integer",
      "label": "Number of Bolt Holes",
      "default": 4,
      "min": 2,
      "max": 12
    }
  },
  "constraints": [
    {
      "expression": "clampThickness < tubeDiameter / 4",
      "message": "Clamp thickness must be less than 1/4 of tube diameter"
    }
  ]
}
```

## Feature Flag

The CAD feature is **feature-flagged** and disabled by default:

**.env:**
```bash
GENERATIVE_CAD_ENABLED=false
```

**Usage:**
```typescript
import { features } from '@/lib/features';

if (features().generativeCADEnabled) {
  // Render CAD UI
}
```

## Safety Limits

The Worker enforces safety limits to prevent runaway computations:

- **Timeout:** 10 seconds per operation (configurable)
- **Memory:** ~1.2 GB WASM heap (configurable)
- **Sandboxing:** All CADScript executes in Worker (isolated from main thread)
- **No network access** from CADScript
- **No file system access** from CADScript

## Message Protocol

All communication uses a typed message protocol with `Ok<T> | Err` pattern:

**Request:**
```typescript
{
  type: 'buildModel',
  cadScript: '...ES module text...',
  params: { diameter: 200, height: 50 },
  mesher: {
    linearDeflection: 0.1,
    angularDeflection: 0.5
  }
}
```

**Response (Success):**
```typescript
{
  ok: true,
  shapeId: 'shape_1234567890',
  triCount: 5024,
  mesh: ArrayBuffer,  // Float32Array [x,y,z, nx,ny,nz, ...]
  bbox: {
    min: [0, 0, 0],
    max: [200, 200, 50]
  },
  volume: 1570796.33,
  surfaceArea: 94247.78
}
```

**Response (Error):**
```typescript
{
  ok: false,
  error: 'CADScript execution failed: ReferenceError: foo is not defined',
  stack: '...',
  log: ['[info] Building model...', '[error] foo is not defined']
}
```

## Client SDK Usage

```typescript
import { CADClient } from '@/cad/client/cad-client';

const client = new CADClient({
  onProgress: (event) => {
    console.log(`${event.operation}: ${event.progress * 100}%`);
  },
  onLog: (event) => {
    console.log(`[${event.level}] ${event.message}`);
  },
});

await client.init();

const result = await client.buildModel(cadScript, params, {
  linearDeflection: 0.1,
  angularDeflection: 0.5,
});

// result.mesh is an ArrayBuffer ready for Three.js
```

## React Hook

```typescript
import { useCADClient } from '@/cad/client/cad-client';

function MyComponent() {
  const { client, isReady, error } = useCADClient();

  useEffect(() => {
    if (isReady) {
      client.buildModel(script, params).then(console.log);
    }
  }, [isReady]);

  if (error) return <div>Error: {error.message}</div>;
  if (!isReady) return <div>Loading CAD engine...</div>;

  return <CadViewer />;
}
```

## Next Steps (T1-T7)

- **T1:** Implement actual OCCT bindings in Worker
- **T2:** Complete CAD Runtime API (primitives, ops, bool, query)
- **T3:** Build Three.js viewer with measurement tools
- **T4:** Implement STEP/STL import/export
- **T5:** Create 5 template CADScripts (tube clamp, focuser, dovetail, etc.)
- **T6:** Add caching, progressive meshing, telemetry
- **T7:** Write tests, CI checks, and user documentation

## License

OpenCascade.js: LGPL 2.1
CAD Engine code: Same as Telescope project license
