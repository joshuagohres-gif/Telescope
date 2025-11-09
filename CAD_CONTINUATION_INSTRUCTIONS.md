# CAD Engine Implementation - Continuation Instructions (T5-T7)

## Current Status: T0-T4 Complete ✅

This document provides detailed instructions for completing the remaining tasks (T5-T7) of the OpenCascade CAD engine integration.

**Completed Tasks:**
- ✅ T0: Foundations (feature flag, directory structure, OCCT decision)
- ✅ T1: OCCT Worker with message protocol
- ✅ T2: CAD Runtime API (primitives, operations, booleans, queries)
- ✅ T3: Three.js Viewer component with controls
- ✅ T4: I/O and healing pipeline (STEP/STL import/export)

**Remaining Tasks:**
- ⏳ T5: Build Generative Bridge and 5 templates
- ⏳ T6: Add performance optimizations and telemetry
- ⏳ T7: Create tests, CI, and documentation

---

## Repository Information

- **GitHub Repository**: https://github.com/joshuagohres-gif/Telescope.git
- **Branch**: main
- **CAD Feature Location**: `client/src/cad/`

---

## T5: Build Generative Bridge and 5 Templates

### Objective
Create an LLM integration bridge that allows natural language descriptions to be converted into parametric CAD models, along with 5 example templates for common telescope parts.

### Implementation Steps

#### 5.1 Create the Generative Bridge

**File**: `client/src/cad/generative/llm-bridge.ts`

Requirements:
- Integration with OpenAI API (already available in the project)
- System prompt that teaches the LLM about CADScript syntax
- Conversion of natural language → ParamSchema + CADScript
- Validation of generated code
- Error handling and retry logic

**Key Components**:

```typescript
interface GenerativeRequest {
  description: string;      // Natural language description
  constraints?: {
    maxDimension?: number;
    material?: string;
    printable?: boolean;    // 3D printable constraints
  };
}

interface GenerativeResponse {
  cadScript: string;
  paramSchema: ParamSchema;
  suggestedParams: Record<string, any>;
  explanation: string;
}

class GenerativeBridge {
  async generateFromDescription(req: GenerativeRequest): Promise<GenerativeResponse>
  async refineModel(existingScript: string, refinement: string): Promise<GenerativeResponse>
  async suggestParameters(script: string): Promise<ParamSchema>
}
```

**System Prompt Template**:
```
You are an expert CAD engineer writing CADScript for the OpenCascade.js engine.

CADScript is JavaScript that receives a BuildContext (ctx) and parameters (params).

Available APIs:
- ctx.primitives: box, sphere, cylinder, cone, torus, sketch
- ctx.ops: extrude, revolve, loft, sweep, fillet, chamfer, transform, arrays
- ctx.bool: union, subtract, intersect
- ctx.query: volume, surfaceArea, boundingBox, faces, edges
- ctx.feature: Tag parts for UI highlighting

Example CADScript:
```javascript
function build(ctx, params) {
  const base = ctx.primitives.cylinder(params.diameter / 2, params.height);
  const hole = ctx.primitives.cylinder(params.holeDiameter / 2, params.height * 1.1);
  const holeArray = ctx.ops.circularArray(hole, {x:0,y:0,z:1}, params.holeCount);
  return ctx.bool.subtract(base, holeArray);
}
```

Your task: Generate CADScript from user descriptions.
Output: JSON with {cadScript, paramSchema, suggestedParams, explanation}
```

**API Endpoint**: `server/cad-generative-routes.ts`
- POST `/api/cad/generate` - Generate from description
- POST `/api/cad/refine` - Refine existing model

#### 5.2 Create 5 Example Templates

**Directory**: `client/src/cad/templates/`

Create the following templates with full ParamSchema and CADScript:

**Template 1**: `tube-clamp.ts`
- Parametric tube clamp ring
- Parameters: tubeDiameter, clampThickness, splitGap, boltHoles, boltDiameter
- Features: Cylindrical ring with split, bolt holes, mounting ears

**Template 2**: `focuser-drawtube.ts`
- Telescope focuser drawtube
- Parameters: innerDiameter, outerDiameter, length, wallThickness, keyway
- Features: Hollow tube with keyway slot, optional compression ring groove

**Template 3**: `dovetail-bar.ts`
- Standard dovetail mounting bar (Losmandy or Vixen style)
- Parameters: length, style ('losmandy'|'vixen'), slotCount, thickness
- Features: Dovetail profile extrusion, mounting slots

**Template 4**: `spider-vane.ts`
- Secondary mirror spider vanes
- Parameters: vaneCount (3 or 4), diameter, thickness, width, curved
- Features: Radial vanes, center hub, mounting holes

**Template 5**: `finder-rings.ts`
- Finder scope mounting rings
- Parameters: scopeDiameter, ringWidth, baseWidth, spacing, screwSize
- Features: Two clamping rings with base plate, adjustment screws

**Each template should include**:
```typescript
export const templateName: string;
export const templateDescription: string;
export const templateTags: string[];
export const paramSchema: ParamSchema;
export const cadScript: string;
export const thumbnail?: string; // Optional base64 PNG
```

#### 5.3 Create Template Browser UI

**File**: `client/src/cad/components/TemplateBrowser.tsx`

Requirements:
- Grid view of available templates
- Filter by tags
- Preview thumbnails
- "Use Template" button loads into viewer
- "Customize" opens parameter editor

#### 5.4 Create Parameter Editor UI

**File**: `client/src/cad/components/ParameterEditor.tsx`

Requirements:
- Dynamic form generation from ParamSchema
- Real-time validation
- Units display (mm, deg, in)
- Constraint violation warnings
- "Rebuild Model" button triggers Worker

### Acceptance Criteria for T5

- [ ] LLM bridge generates valid CADScript from natural language
- [ ] All 5 templates build successfully
- [ ] Each template has comprehensive ParamSchema
- [ ] Template browser displays all templates
- [ ] Parameter editor validates constraints
- [ ] Can rebuild models with different parameters
- [ ] Generated models can be exported to STEP/STL

---

## T6: Add Performance Optimizations and Telemetry

### Objective
Optimize CAD operations for performance and add telemetry to track usage and identify bottlenecks.

### Implementation Steps

#### 6.1 Progressive Meshing

**File**: `client/src/cad/runtime/progressive-mesh.ts`

Requirements:
- Implement LOD (Level of Detail) meshing
- Coarse mesh for preview (fast), fine mesh for export
- Adaptive deflection based on bounding box size
- Mesh simplification for large models

```typescript
interface MeshLOD {
  preview: MeshData;      // Coarse mesh for interactive viewing
  detailed: MeshData;     // Fine mesh for export
  edgeOnly: MeshData;     // Just edges for technical drawings
}

function generateProgressiveMesh(
  oc: OCCTInstance,
  shape: Shape,
  options: {
    previewDeflection: number;
    detailedDeflection: number;
    maxTriangles?: number;
  }
): MeshLOD
```

#### 6.2 Caching Improvements

**File**: `client/src/cad/workers/cache-manager.ts`

Requirements:
- Content-based cache keys (SHA-256 of script + params)
- IndexedDB for persistent caching across sessions
- LRU eviction policy (max 100MB cache size)
- Cache hit/miss metrics

```typescript
interface CacheEntry {
  key: string;
  timestamp: number;
  size: number;
  data: {
    mesh: ArrayBuffer;
    properties: {
      volume: number;
      surfaceArea: number;
      bbox: BoundingBox;
    };
  };
}

class CacheManager {
  async get(key: string): Promise<CacheEntry | null>
  async set(key: string, data: any): Promise<void>
  async clear(): Promise<void>
  getStats(): { hits: number; misses: number; size: number }
}
```

#### 6.3 Worker Pool

**File**: `client/src/cad/client/worker-pool.ts`

Requirements:
- Pool of 2-4 Workers for parallel builds
- Queue management for concurrent requests
- Automatic Worker recycling (prevent memory leaks)
- Graceful degradation if WASM fails to load

#### 6.4 Telemetry

**File**: `client/src/cad/telemetry/metrics.ts`

Requirements:
- Track build times (p50, p95, p99)
- Track mesh generation times
- Track cache hit rates
- Track export times (STEP/STL)
- Track memory usage
- Send metrics to server for analysis

```typescript
interface CADMetrics {
  buildTimeMs: number;
  meshTimeMs: number;
  triangleCount: number;
  cacheHit: boolean;
  memoryMB: number;
  workerCrashed: boolean;
  errorType?: string;
}

function trackBuild(metrics: CADMetrics): void;
function getAggregateMetrics(): {
  builds: number;
  avgBuildTime: number;
  cacheHitRate: number;
  crashRate: number;
}
```

**API Endpoint**: `server/cad-metrics-routes.ts`
- POST `/api/cad/metrics` - Submit metrics
- GET `/api/cad/metrics/summary` - Get aggregate stats

### Acceptance Criteria for T6

- [ ] Progressive meshing provides fast preview
- [ ] Cache reduces repeat builds by >80%
- [ ] Worker pool handles concurrent builds
- [ ] Telemetry tracks all operations
- [ ] Memory usage stays under 1.5GB
- [ ] No Worker crashes during normal operation
- [ ] Metrics dashboard shows performance trends

---

## T7: Create Tests, CI, and Documentation

### Objective
Ensure code quality, reliability, and maintainability through comprehensive testing and documentation.

### Implementation Steps

#### 7.1 Unit Tests

**Directory**: `client/src/cad/__tests__/`

Test files needed:
- `param-schema.test.ts` - Parameter validation
- `cad-runtime.test.ts` - Primitives, operations, booleans
- `worker-protocol.test.ts` - Message serialization
- `cache-manager.test.ts` - Caching logic
- `step-export.test.ts` - Export validation
- `step-import.test.ts` - Import and healing

**Framework**: Vitest (already configured in project)

Example test:
```typescript
import { describe, it, expect } from 'vitest';
import { validateParams, exampleSchema } from '../types/param-schema';

describe('ParamSchema validation', () => {
  it('should validate correct parameters', () => {
    const result = validateParams(exampleSchema, {
      tubeDiameter: 200,
      clampThickness: 5,
      clampHeight: 30,
      boltHoles: 4,
      boltDiameter: 6,
      splitGap: 5,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid parameters', () => {
    const result = validateParams(exampleSchema, {
      tubeDiameter: 200,
      clampThickness: 100, // Too thick!
      boltHoles: 4,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

#### 7.2 Integration Tests

**Directory**: `client/src/cad/__tests__/integration/`

Test files:
- `worker-integration.test.ts` - Full Worker lifecycle
- `build-pipeline.test.ts` - End-to-end CADScript → Mesh
- `export-import.test.ts` - Round-trip STEP export/import
- `template-builds.test.ts` - All 5 templates build successfully

**Golden Files**: Store reference STEP files for comparison
- `__golden__/tube-clamp.step`
- `__golden__/focuser-drawtube.step`
- etc.

#### 7.3 E2E Tests

**File**: `e2e/cad-viewer.spec.ts`

Tests using Playwright:
- Load viewer
- Build demo model
- Interact with controls (rotate, section plane, measurements)
- Export STEP file
- Import STEP file
- Generate from LLM description

#### 7.4 Performance Tests

**File**: `client/src/cad/__tests__/performance/`

Benchmarks:
- Build time for various model complexities
- Mesh generation time vs triangle count
- Cache retrieval time
- Memory usage over 100 sequential builds

**Acceptance Criteria**:
- Simple model (cylinder): <200ms build time
- Complex model (5 boolean ops): <2s build time
- Mesh 10K triangles: <100ms
- Cache retrieval: <10ms

#### 7.5 CI Configuration

**File**: `.github/workflows/cad-tests.yml`

```yaml
name: CAD Tests

on:
  push:
    branches: [main]
  pull_request:
    paths:
      - 'client/src/cad/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run unit tests
        run: npm test -- --run client/src/cad

      - name: Run integration tests
        run: npm test -- --run client/src/cad/__tests__/integration

      - name: Check bundle size
        run: |
          npm run build
          # Ensure CAD bundle is <500KB (without WASM)

      - name: Performance benchmarks
        run: npm run bench:cad
```

#### 7.6 Documentation

**Files to create**:

1. **`client/src/cad/docs/API.md`** - Complete API reference
   - All interfaces and types
   - Code examples for each API
   - Common patterns and best practices

2. **`client/src/cad/docs/CADSCRIPT_GUIDE.md`** - CADScript tutorial
   - Getting started
   - Primitives examples
   - Operations examples
   - Boolean operations
   - Advanced techniques (arrays, lofts, sweeps)
   - Debugging tips

3. **`client/src/cad/docs/TEMPLATES.md`** - Template development guide
   - How to create a new template
   - ParamSchema best practices
   - Testing templates
   - Thumbnail generation

4. **`client/src/cad/docs/DEPLOYMENT.md`** - Production deployment
   - WASM hosting (CDN vs self-hosted)
   - Worker configuration
   - Memory limits and browser compatibility
   - Error monitoring
   - Fallback strategies

5. **`client/src/cad/docs/ARCHITECTURE.md`** - System design
   - Worker architecture diagram
   - Message flow
   - Caching strategy
   - Performance considerations
   - Security model

6. **Update `README.md`** in root with CAD feature section

### Acceptance Criteria for T7

- [ ] >90% code coverage for core modules
- [ ] All 5 templates pass integration tests
- [ ] Golden file tests prevent regressions
- [ ] CI runs on every commit
- [ ] Performance benchmarks meet targets
- [ ] API documentation is complete
- [ ] User guide with examples
- [ ] Architecture documented with diagrams

---

## Testing the Complete System

### Manual Testing Checklist

1. **Build Pipeline**
   - [ ] Load demo page (`/cad-demo`)
   - [ ] Click "Build Model" - should generate cylinder with holes
   - [ ] Verify mesh renders in Three.js viewer
   - [ ] Check build info shows correct triangles/volume

2. **Viewer Controls**
   - [ ] Rotate with left mouse - should orbit smoothly
   - [ ] Pan with right mouse - should translate
   - [ ] Zoom with wheel - should scale view
   - [ ] Click view presets (Top, Front, Right, Iso)
   - [ ] Toggle mesh/edges/grid visibility
   - [ ] Enable section plane - should clip geometry
   - [ ] Adjust section position - should move plane

3. **Export**
   - [ ] Export STEP - should download `.step` file
   - [ ] Export STL - should download `.stl` file
   - [ ] Open STEP in FreeCAD/OnShape - should be valid
   - [ ] Open STL in slicer - should be printable

4. **Import**
   - [ ] Import STEP file
   - [ ] Verify healing stats (faces healed, etc.)
   - [ ] Model should render in viewer

5. **LLM Generation** (T5)
   - [ ] Enter description: "A telescope tube clamp for 200mm diameter tube"
   - [ ] Click "Generate" - should produce CADScript
   - [ ] Build generated model - should render
   - [ ] Adjust parameters - should rebuild

6. **Templates** (T5)
   - [ ] Load template browser
   - [ ] Click each of 5 templates - should build
   - [ ] Edit parameters - should update model
   - [ ] Export each template - should work

7. **Performance** (T6)
   - [ ] Build 10 models sequentially - should use cache
   - [ ] Check cache hit rate in metrics - should be >80%
   - [ ] Monitor memory in DevTools - should stay <1.5GB
   - [ ] No Worker crashes

---

## Development Environment Setup

### Prerequisites
- Node.js 18+
- npm or pnpm
- Git
- OpenAI API key (for LLM bridge)

### Installation
```bash
git clone https://github.com/joshuagohres-gif/Telescope.git
cd Telescope
npm install
```

### Environment Variables
Add to `.env`:
```bash
GENERATIVE_CAD_ENABLED=true
OPENAI_API_KEY=your_key_here
```

### Run Development Server
```bash
npm run dev
```

Access CAD demo at: `http://localhost:5000/cad-demo`

### Run Tests
```bash
npm test                    # All tests
npm test -- cad            # CAD tests only
npm run bench:cad          # Performance benchmarks
```

---

## Important Notes

### OCCT WASM Installation

The project uses OpenCascade.js but it's **NOT YET INSTALLED**. You'll need to:

```bash
npm install opencascade.js
```

This will download ~40MB of WASM files. Alternatively, use CDN (already configured):
```typescript
wasmPath: 'https://cdn.jsdelivr.net/npm/opencascade.js@2.0.0/dist/opencascade.wasm.wasm'
```

### Known Limitations

1. **Browser Support**: WASM requires modern browsers (Chrome 89+, Firefox 87+, Safari 14.1+)
2. **Memory**: OCCT can use 1-2GB of memory for complex models
3. **Worker Timeout**: Operations timeout after 10 seconds (configurable)
4. **Cache Size**: Limited to 100MB in IndexedDB

### Security Considerations

- CADScript executes in isolated Worker (no main thread access)
- No file system or network access from CADScript
- Input validation on all parameters
- Rate limiting on LLM API calls
- Sanitize user descriptions before sending to LLM

---

## File Structure Reference

```
client/src/cad/
├── README.md                    # Architecture overview
├── INSTALL.md                   # Installation guide
├── index.ts                     # Public API exports
│
├── types/                       # TypeScript definitions
│   ├── worker-protocol.ts       # Worker message types
│   ├── param-schema.ts          # Parameter schema types
│   └── cad-runtime.ts           # CAD API types
│
├── workers/                     # Web Workers
│   └── occt.worker.ts           # Main OCCT Worker
│
├── runtime/                     # OCCT Runtime
│   ├── occt-runtime.ts          # CAD API implementation
│   └── progressive-mesh.ts      # LOD meshing (T6)
│
├── client/                      # Client SDK
│   ├── cad-client.ts            # Worker communication
│   └── worker-pool.ts           # Worker pool (T6)
│
├── viewer/                      # Three.js Viewer
│   ├── cad-scene.ts             # Scene management
│   ├── CadViewer.tsx            # React component
│   ├── CadDemo.tsx              # Demo page
│   └── index.ts                 # Exports
│
├── io/                          # Import/Export
│   ├── step-export.ts           # STEP exporter
│   ├── stl-export.ts            # STL exporter
│   ├── step-import.ts           # STEP importer + healing
│   └── index.ts                 # Exports
│
├── generative/                  # LLM Integration (T5)
│   ├── llm-bridge.ts            # OpenAI integration
│   └── prompt-templates.ts      # System prompts
│
├── templates/                   # CAD Templates (T5)
│   ├── tube-clamp.ts
│   ├── focuser-drawtube.ts
│   ├── dovetail-bar.ts
│   ├── spider-vane.ts
│   ├── finder-rings.ts
│   └── index.ts
│
├── components/                  # React Components (T5)
│   ├── TemplateBrowser.tsx
│   ├── ParameterEditor.tsx
│   └── GenerativeInput.tsx
│
├── telemetry/                   # Metrics (T6)
│   ├── metrics.ts
│   └── reporter.ts
│
├── __tests__/                   # Tests (T7)
│   ├── unit/
│   ├── integration/
│   ├── performance/
│   └── __golden__/
│
└── docs/                        # Documentation (T7)
    ├── API.md
    ├── CADSCRIPT_GUIDE.md
    ├── TEMPLATES.md
    ├── DEPLOYMENT.md
    └── ARCHITECTURE.md
```

---

## Success Metrics

### T5 Success Metrics
- 5 templates built and tested
- LLM generates valid CADScript >90% of the time
- Parameter editor handles all schema types
- Template browser loads <500ms

### T6 Success Metrics
- Build time <2s for complex models
- Cache hit rate >80% for repeat builds
- Memory usage <1.5GB sustained
- No Worker crashes during 100 sequential builds
- Telemetry captures all operations

### T7 Success Metrics
- Code coverage >90%
- All templates pass golden file tests
- CI pipeline <5 minutes
- Documentation covers all APIs
- Zero critical bugs in production

---

## Support and Resources

### Reference Documentation
- **OpenCascade.js**: https://github.com/donalffons/opencascade.js
- **OCCT Documentation**: https://dev.opencascade.org/
- **Three.js Docs**: https://threejs.org/docs/
- **STEP Standard**: ISO 10303 (AP214, AP242)

### Existing Code Examples
- See `client/src/cad/viewer/CadDemo.tsx` for full integration example
- See `client/src/cad/types/param-schema.ts` for `exampleSchema`
- See `client/src/cad/README.md` for architecture details

### Troubleshooting
- Check `client/src/cad/INSTALL.md` for common issues
- Enable Worker logging: `enableLogging: true` in CADClient config
- Use browser DevTools to inspect Worker messages
- Check WASM memory with `performance.memory` API

---

## Contact Information

**Repository**: https://github.com/joshuagohres-gif/Telescope.git
**Feature Branch**: main (or create feature/cad-generative for T5-T7)

**Current Status**: T0-T4 complete, ready for T5-T7 implementation

**Estimated Time**:
- T5 (Generative + Templates): 8-12 hours
- T6 (Performance): 4-6 hours
- T7 (Tests + Docs): 6-8 hours
- **Total**: 18-26 hours

---

Good luck! The foundation is solid and ready for the final features. 🚀
