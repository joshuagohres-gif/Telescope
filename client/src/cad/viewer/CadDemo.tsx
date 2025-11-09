/**
 * CAD Demo Component
 *
 * Example usage of the CAD Client + Viewer integration.
 * Shows how to build a model and display it in the viewer.
 */

import { useState, useEffect } from 'react';
import { CadViewer } from './CadViewer';
import { CADClient } from '../client/cad-client';
import type { BuildRes } from '../types/worker-protocol';
import type { MeshData } from './cad-scene';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ===== EXAMPLE CADSCRIPT =====

const EXAMPLE_SCRIPT = `
// Simple CAD model: A cylinder with mounting holes
function build(ctx, params) {
  const { primitives, ops, bool, feature } = ctx;

  // Create base cylinder
  const base = primitives.cylinder(
    params.diameter / 2,
    params.height
  );

  // Create a single bolt hole
  const hole = primitives.cylinder(
    params.boltDiameter / 2,
    params.height * 1.2  // Slightly longer to ensure clean cut
  );

  // Create array of holes around circumference
  const holes = ops.circularArray(
    hole,
    { x: 0, y: 0, z: 1 },  // Z-axis
    params.boltHoles
  );

  // Translate holes to the bolt circle diameter
  const bcd = params.diameter * 0.7;  // Bolt circle diameter
  const translatedHole = ops.translate(hole, {
    x: bcd / 2,
    y: 0,
    z: 0
  });

  const holeArray = ops.circularArray(
    translatedHole,
    { x: 0, y: 0, z: 1 },
    params.boltHoles
  );

  // Boolean subtract holes from base
  const result = bool.subtract(base, holeArray);

  // Tag features for UI
  feature('main_body', base);
  feature('mounting_holes', holeArray);

  ctx.log(\`Created model with \${params.boltHoles} mounting holes\`);

  return result;
}
`;

const EXAMPLE_PARAMS = {
  diameter: 100,
  height: 30,
  boltHoles: 4,
  boltDiameter: 6,
};

// ===== COMPONENT =====

export function CadDemo() {
  const [client] = useState(() => new CADClient({ enableLogging: true }));
  const [isInitializing, setIsInitializing] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meshData, setMeshData] = useState<MeshData | null>(null);
  const [buildInfo, setBuildInfo] = useState<{
    triCount: number;
    volume: number;
    surfaceArea: number;
  } | null>(null);

  // Initialize CAD client
  useEffect(() => {
    let mounted = true;

    client
      .init()
      .then(() => {
        if (mounted) {
          setIsInitializing(false);
          console.log('CAD client initialized successfully');
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(`Initialization failed: ${err.message}`);
          setIsInitializing(false);
        }
      });

    return () => {
      mounted = false;
      client.terminate();
    };
  }, [client]);

  // Build model
  const handleBuild = async () => {
    setIsBuilding(true);
    setError(null);

    try {
      const result = await client.buildModel(EXAMPLE_SCRIPT, EXAMPLE_PARAMS, {
        linearDeflection: 0.1,
        angularDeflection: 0.5,
      });

      // Convert result to MeshData format
      const mesh: MeshData = {
        vertices: new Float32Array(result.mesh),
        edges: result.edges ? new Float32Array(result.edges) : undefined,
      };

      setMeshData(mesh);
      setBuildInfo({
        triCount: result.triCount,
        volume: result.volume || 0,
        surfaceArea: result.surfaceArea || 0,
      });
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">CAD Engine Demo</h1>
            <p className="text-sm text-muted-foreground">
              OpenCascade.js + Three.js Viewer
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isInitializing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Initializing WASM...
              </div>
            ) : (
              <Button
                onClick={handleBuild}
                disabled={isBuilding}
              >
                {isBuilding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Building...
                  </>
                ) : (
                  'Build Model'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar with parameters and info */}
        <div className="w-80 border-r bg-card p-4 space-y-4 overflow-y-auto">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Model Parameters</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Diameter:</span>
                <span className="font-mono">{EXAMPLE_PARAMS.diameter} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Height:</span>
                <span className="font-mono">{EXAMPLE_PARAMS.height} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bolt Holes:</span>
                <span className="font-mono">{EXAMPLE_PARAMS.boltHoles}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bolt Diameter:</span>
                <span className="font-mono">{EXAMPLE_PARAMS.boltDiameter} mm</span>
              </div>
            </div>
          </Card>

          {buildInfo && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Build Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Triangles:</span>
                  <span className="font-mono">{buildInfo.triCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Volume:</span>
                  <span className="font-mono">{buildInfo.volume.toFixed(2)} mm³</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Surface Area:</span>
                  <span className="font-mono">{buildInfo.surfaceArea.toFixed(2)} mm²</span>
                </div>
              </div>
            </Card>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="p-4">
            <h3 className="font-semibold mb-3">CADScript</h3>
            <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
              <code>{EXAMPLE_SCRIPT.trim()}</code>
            </pre>
          </Card>
        </div>

        {/* Viewer */}
        <div className="flex-1">
          {meshData ? (
            <CadViewer meshData={meshData} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="mb-2">No model loaded</p>
                <p className="text-sm">Click "Build Model" to generate a demo model</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
