/**
 * CAD Viewer React Component
 *
 * React wrapper for the Three.js CAD scene.
 * Provides UI controls for view manipulation, section planes, and measurements.
 */

import { useEffect, useRef, useState } from 'react';
import { CadScene, type CadSceneConfig, type MeshData } from './cad-scene';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Maximize2,
  RotateCcw,
  Box,
  Grid3x3,
  Ruler,
  Scissors,
  Camera,
  Eye,
  EyeOff,
  Download,
} from 'lucide-react';
import * as THREE from 'three';

// ===== PROPS =====

export interface CadViewerProps {
  meshData?: MeshData;
  config?: CadSceneConfig;
  onSceneReady?: (scene: CadScene) => void;
  className?: string;
}

// ===== COMPONENT =====

export function CadViewer({ meshData, config, onSceneReady, className }: CadViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CadScene | null>(null);

  const [showMesh, setShowMesh] = useState(true);
  const [showEdges, setShowEdges] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [sectionEnabled, setSectionEnabled] = useState(false);
  const [sectionPosition, setSectionPosition] = useState(0);

  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new CadScene(containerRef.current, config);
    sceneRef.current = scene;

    if (onSceneReady) {
      onSceneReady(scene);
    }

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [config, onSceneReady]);

  // Load mesh data
  useEffect(() => {
    if (!sceneRef.current || !meshData) return;
    sceneRef.current.loadMesh(meshData);
  }, [meshData]);

  // Visibility controls
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setMeshVisible(showMesh);
  }, [showMesh]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setEdgesVisible(showEdges);
  }, [showEdges]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setGridVisible(showGrid);
  }, [showGrid]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setAxesVisible(showAxes);
  }, [showAxes]);

  // Section plane
  useEffect(() => {
    if (!sceneRef.current) return;

    if (sectionEnabled) {
      const pos = new THREE.Vector3(0, sectionPosition, 0);
      const normal = new THREE.Vector3(0, 1, 0);
      sceneRef.current.setSectionPlane(true, pos, normal);
    } else {
      sceneRef.current.setSectionPlane(false);
    }
  }, [sectionEnabled, sectionPosition]);

  // Handlers
  const handleResetCamera = () => {
    sceneRef.current?.resetCamera();
  };

  const handleFitView = () => {
    sceneRef.current?.fitCameraToModel();
  };

  const handleSetView = (view: 'top' | 'front' | 'right' | 'iso') => {
    sceneRef.current?.setCameraView(view);
  };

  const handleScreenshot = () => {
    if (!sceneRef.current) return;

    const dataUrl = sceneRef.current.takeScreenshot();
    const link = document.createElement('a');
    link.download = `cad-model-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-card">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFitView}
            title="Fit to view"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetCamera}
            title="Reset camera"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* View presets */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSetView('top')}
            title="Top view"
          >
            Top
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSetView('front')}
            title="Front view"
          >
            Front
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSetView('right')}
            title="Right view"
          >
            Right
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSetView('iso')}
            title="Isometric view"
          >
            Iso
          </Button>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Visibility toggles */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={showMesh ? 'secondary' : 'ghost'}
            onClick={() => setShowMesh(!showMesh)}
            title="Toggle mesh"
          >
            {showMesh ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            variant={showEdges ? 'secondary' : 'ghost'}
            onClick={() => setShowEdges(!showEdges)}
            title="Toggle edges"
          >
            <Box className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={showGrid ? 'secondary' : 'ghost'}
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle grid"
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Section plane toggle */}
        <Button
          size="sm"
          variant={sectionEnabled ? 'secondary' : 'ghost'}
          onClick={() => setSectionEnabled(!sectionEnabled)}
          title="Section plane"
        >
          <Scissors className="w-4 h-4" />
        </Button>

        <div className="flex-1" />

        {/* Screenshot */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleScreenshot}
          title="Take screenshot"
        >
          <Camera className="w-4 h-4" />
        </Button>
      </div>

      {/* Main viewer area */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Three.js canvas container */}
        <div
          ref={containerRef}
          className="flex-1 bg-background"
          style={{ touchAction: 'none' }}
        />

        {/* Side panel for controls */}
        <div className="w-64 border-l bg-card p-4 space-y-4 overflow-y-auto">
          <Card className="p-3 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Visibility
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="mesh-visible" className="text-sm">
                  Show Mesh
                </Label>
                <Switch
                  id="mesh-visible"
                  checked={showMesh}
                  onCheckedChange={setShowMesh}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="edges-visible" className="text-sm">
                  Show Edges
                </Label>
                <Switch
                  id="edges-visible"
                  checked={showEdges}
                  onCheckedChange={setShowEdges}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="grid-visible" className="text-sm">
                  Show Grid
                </Label>
                <Switch
                  id="grid-visible"
                  checked={showGrid}
                  onCheckedChange={setShowGrid}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="axes-visible" className="text-sm">
                  Show Axes
                </Label>
                <Switch
                  id="axes-visible"
                  checked={showAxes}
                  onCheckedChange={setShowAxes}
                />
              </div>
            </div>
          </Card>

          <Card className="p-3 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Scissors className="w-4 h-4" />
              Section Plane
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="section-enabled" className="text-sm">
                  Enabled
                </Label>
                <Switch
                  id="section-enabled"
                  checked={sectionEnabled}
                  onCheckedChange={setSectionEnabled}
                />
              </div>

              {sectionEnabled && (
                <div className="space-y-1">
                  <Label htmlFor="section-position" className="text-xs text-muted-foreground">
                    Position (Y): {sectionPosition.toFixed(1)}
                  </Label>
                  <Slider
                    id="section-position"
                    value={[sectionPosition]}
                    onValueChange={(values) => setSectionPosition(values[0])}
                    min={-100}
                    max={100}
                    step={1}
                  />
                </div>
              )}
            </div>
          </Card>

          <Card className="p-3 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              Measurements
            </h3>

            <p className="text-xs text-muted-foreground">
              Measurement tools coming soon
            </p>
          </Card>

          <Card className="p-3 space-y-2">
            <h3 className="font-semibold text-sm">Controls</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Left mouse:</strong> Rotate</p>
              <p><strong>Right mouse:</strong> Pan</p>
              <p><strong>Wheel:</strong> Zoom</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
