# Installing OpenCascade.js

This guide covers installation and setup of OpenCascade.js for the CAD feature.

## Prerequisites

- Node.js 18+ (for WASM support)
- Modern browser with WebAssembly support
- At least 2GB free RAM (OCCT WASM is memory-intensive)

## Installation

### Option 1: NPM Package (Recommended for Development)

```bash
cd Telescope
npm install opencascade.js
```

**Note:** The `opencascade.js` package is large (~40MB including WASM files). Installation may take several minutes.

### Option 2: CDN (Recommended for Production)

The Worker is configured to load OCCT WASM from CDN by default:

```typescript
// In occt.worker.ts
const DEFAULT_CONFIG: WorkerConfig = {
  wasmPath: 'https://cdn.jsdelivr.net/npm/opencascade.js@2.0.0/dist/opencascade.wasm.wasm',
  // ...
};
```

**Advantages:**
- No bundle bloat (WASM loaded on-demand)
- CDN caching
- Faster npm install

**Disadvantages:**
- Requires internet connection
- CDN dependency

### Option 3: Self-Hosted WASM

For offline or air-gapped deployments:

1. Install the package:
   ```bash
   npm install opencascade.js
   ```

2. Copy WASM files to public directory:
   ```bash
   mkdir -p public/wasm
   cp node_modules/opencascade.js/dist/*.wasm public/wasm/
   ```

3. Update Worker config:
   ```typescript
   const config: WorkerConfig = {
     wasmPath: '/wasm/opencascade.wasm.wasm',
     // ...
   };
   ```

## Build Configuration

### Vite Configuration

The project uses Vite for bundling. Web Workers with WASM require special handling.

**vite.config.ts** should include:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es', // Use ES modules for workers
  },
  optimizeDeps: {
    exclude: ['opencascade.js'], // Don't pre-bundle OCCT
  },
  build: {
    target: 'esnext', // WebAssembly requires modern JS
  },
});
```

### TypeScript Configuration

OCCT types are complex and dynamically generated. The Worker uses `any` types for OCCT instances.

**tsconfig.json** should include:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable", "WebWorker"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    // ...
  }
}
```

## Verification

Test that OCCT loads correctly:

```typescript
import { CADClient } from '@/cad/client/cad-client';

const client = new CADClient({
  onLog: (event) => console.log(event.message),
});

await client.init(); // Should log "OpenCascade WASM initialized successfully"
```

## Troubleshooting

### "Failed to fetch WASM"

**Cause:** Network error or incorrect `wasmPath`

**Solution:**
1. Check browser DevTools Network tab
2. Verify CDN is accessible
3. Try self-hosted WASM (Option 3)

### "Out of memory" errors

**Cause:** WASM heap exceeded (default 1.2GB)

**Solution:**
1. Reduce mesh quality (increase `linearDeflection`)
2. Simplify models (fewer boolean operations)
3. Increase memory limit (if browser allows):
   ```typescript
   const config: WorkerConfig = {
     maxMemoryMB: 2048, // 2GB (may not work on all browsers)
   };
   ```

### Worker fails silently

**Cause:** Uncaught exception in Worker

**Solution:**
1. Enable logging:
   ```typescript
   const client = new CADClient({
     enableLogging: true,
     onLog: (event) => console.error(event),
   });
   ```
2. Check browser console for Worker errors
3. Verify Worker path is correct

### OCCT functions not found

**Cause:** Incorrect OCCT version or API changes

**Solution:**
1. Verify opencascade.js version:
   ```bash
   npm list opencascade.js
   ```
2. Check `occt-runtime.ts` for API compatibility
3. Refer to OCCT documentation: https://dev.opencascade.org/

## Performance Tips

1. **Use CDN for production** - Reduces bundle size and leverages browser caching

2. **Adjust mesh quality** - Lower quality = faster meshing:
   ```typescript
   await client.buildModel(script, params, {
     linearDeflection: 0.5,  // Higher = coarser mesh (default: 0.1)
     angularDeflection: 1.0, // Higher = coarser mesh (default: 0.5)
   });
   ```

3. **Cache models** - Enable caching in Worker config:
   ```typescript
   const config: WorkerConfig = {
     cachingEnabled: true, // Cache by (script, params, mesher)
   };
   ```

4. **Limit complexity** - Avoid:
   - More than 10 boolean operations
   - More than 100,000 triangles
   - Circular arrays with > 50 copies

## License

**opencascade.js**: LGPL 2.1 (Free for commercial use with dynamic linking)

**Important:** The LGPL allows:
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution

**Requirements:**
- Must provide LGPL license text
- Must allow users to replace OCCT with their own build (dynamic linking satisfied by Worker architecture)
- Changes to OCCT must be open-sourced (but not your application)

## Resources

- **OCCT Documentation**: https://dev.opencascade.org/
- **opencascade.js GitHub**: https://github.com/donalffons/opencascade.js
- **CAD Runtime API**: See `client/src/cad/types/cad-runtime.ts`
- **Examples**: See `client/src/cad/templates/`

## Next Steps

After installation, proceed to:
- [CAD Runtime API](./README.md#cad-runtime-api)
- [Creating CADScripts](./templates/README.md)
- [Viewer Integration](./viewer/README.md)
