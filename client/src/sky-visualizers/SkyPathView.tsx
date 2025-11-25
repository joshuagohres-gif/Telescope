import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, ZoomIn, ZoomOut, RotateCcw, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SceneHost } from "@/simulatedSkyBackdrop/renderer/SceneHost";
import { SkyDome } from "@/simulatedSkyBackdrop/renderer/SkyDome";
import { StaticSkyImageLayer } from "@/simulatedSkyBackdrop/renderer/StaticSkyImageLayer";
import { PathOverlayLayer } from "./PathOverlayLayer";

interface SkyPathPoint {
  t: number;
  ra: number; // radians
  dec: number; // radians
  alt: number; // degrees
  az: number; // degrees
  magnitude?: number;
  distance?: number;
  visible: boolean;
}

interface SkyPathViewProps {
  objectIds: number[];
  observerLat: number;
  observerLon: number;
  startDate: Date;
  endDate: Date;
}

export function SkyPathView({
  objectIds,
  observerLat,
  observerLon,
  startDate,
  endDate,
}: SkyPathViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneHostRef = useRef<SceneHost | null>(null);
  const pathLayerRef = useRef<PathOverlayLayer | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [fov, setFov] = useState(75); // Field of view in degrees

  // Camera orientation (in radians)
  const [yaw, setYaw] = useState(0); // 0 = North
  const [pitch, setPitch] = useState(Math.PI / 4); // 45° up

  // Mouse interaction state
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Colors for objects
  const colors = useMemo(() => ["#00ff00", "#ff00ff", "#00ffff", "#ffff00", "#ff0000"], []);

  // Fetch sky paths for all objects
  const { data: skyPaths, isLoading } = useQuery({
    queryKey: ["sky-paths", objectIds, observerLat, observerLon, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (objectIds.length === 0) return [];
      const promises = objectIds.map(async (id) => {
        const params = new URLSearchParams();
        params.set("lat", observerLat.toString());
        params.set("lon", observerLon.toString());
        params.set("start_date", startDate.toISOString());
        params.set("end_date", endDate.toISOString());
        params.set("step_hours", "1.0");

        const response = await fetch(
          `/api/sky-visualizers/objects/${id}/sky-path?${params}`
        );
        if (!response.ok) return { id, points: [] };
        const result = await response.json();
        return { id, points: result.data as SkyPathPoint[] };
      });
      return Promise.all(promises);
    },
    enabled: objectIds.length > 0,
  });

  // Initialize WebGL scene
  useEffect(() => {
    if (!containerRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';

    containerRef.current.appendChild(canvas);
    canvasRef.current = canvas;

    try {
      // Initialize WebGL scene
      const sceneHost = new SceneHost({
        canvas: canvas,
        enableAntialias: true,
      });

      const gl = sceneHost.getContext();
      if (!gl) {
        throw new Error('Failed to initialize WebGL2 context');
      }

      // Create render layers
      const skyDome = new SkyDome(gl);
      const staticSkyLayer = new StaticSkyImageLayer(gl, {
        latitude: observerLat,
        longitude: observerLon,
        time: startDate,
      });
      const pathLayer = new PathOverlayLayer(gl);

      // Add layers to scene (order matters)
      sceneHost.addLayer(skyDome);
      sceneHost.addLayer(staticSkyLayer);
      sceneHost.addLayer(pathLayer);

      // Set initial camera orientation
      sceneHost.setCameraOrientation(yaw, pitch);
      sceneHost.setFieldOfView(fov);

      // Start rendering
      sceneHost.start();

      sceneHostRef.current = sceneHost;
      pathLayerRef.current = pathLayer;
    } catch (err) {
      console.error('Failed to initialize WebGL scene:', err);
      setError('WebGL initialization failed');
    }

    // Cleanup on unmount
    return () => {
      if (sceneHostRef.current) {
        sceneHostRef.current.dispose();
        sceneHostRef.current = null;
      }
      if (canvasRef.current && containerRef.current) {
        containerRef.current.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Update observer location and time when they change
  useEffect(() => {
    if (!sceneHostRef.current) return;

    const layers = (sceneHostRef.current as any).layers;
    if (!layers) return;

    // Find and update the StaticSkyImageLayer
    for (const layer of layers) {
      if (layer instanceof StaticSkyImageLayer) {
        layer.updateObserver(observerLat, observerLon, startDate);
      }
    }
  }, [observerLat, observerLon, startDate]);

  // Update camera when yaw/pitch/fov changes
  useEffect(() => {
    if (!sceneHostRef.current) return;
    sceneHostRef.current.setCameraOrientation(yaw, pitch);
  }, [yaw, pitch]);

  useEffect(() => {
    if (!sceneHostRef.current) return;
    sceneHostRef.current.setFieldOfView(fov);
  }, [fov]);

  // Update path overlay when sky paths change
  useEffect(() => {
    if (!pathLayerRef.current || !skyPaths) return;

    const paths = skyPaths.map((pathData, idx) => ({
      id: pathData.id,
      points: pathData.points,
      color: colors[idx % colors.length],
    }));

    pathLayerRef.current.updatePaths(paths);
  }, [skyPaths, colors]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    // Update yaw (horizontal rotation)
    setYaw(y => {
      let newYaw = y - dx * 0.005; // Sensitivity factor
      // Normalize to 0-2π
      while (newYaw < 0) newYaw += 2 * Math.PI;
      while (newYaw >= 2 * Math.PI) newYaw -= 2 * Math.PI;
      return newYaw;
    });

    // Update pitch (vertical rotation), clamped to avoid flipping
    setPitch(p => {
      const newPitch = p + dy * 0.005;
      return Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, newPitch));
    });

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 5 : -5;
    setFov(f => Math.max(10, Math.min(120, f + delta)));
  };

  const handleReset = () => {
    setYaw(0); // North
    setPitch(Math.PI / 4); // 45° up
    setFov(75);
  };

  // Calculate current viewing direction
  const viewDirection = useMemo(() => {
    const azDeg = (yaw * 180 / Math.PI);
    const altDeg = (pitch * 180 / Math.PI);

    // Get cardinal direction
    let cardinal = 'N';
    if (azDeg >= 22.5 && azDeg < 67.5) cardinal = 'NE';
    else if (azDeg >= 67.5 && azDeg < 112.5) cardinal = 'E';
    else if (azDeg >= 112.5 && azDeg < 157.5) cardinal = 'SE';
    else if (azDeg >= 157.5 && azDeg < 202.5) cardinal = 'S';
    else if (azDeg >= 202.5 && azDeg < 247.5) cardinal = 'SW';
    else if (azDeg >= 247.5 && azDeg < 292.5) cardinal = 'W';
    else if (azDeg >= 292.5 && azDeg < 337.5) cardinal = 'NW';

    return {
      cardinal,
      azimuth: azDeg.toFixed(1),
      altitude: altDeg.toFixed(1),
    };
  }, [yaw, pitch]);

  if (isLoading && objectIds.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] bg-black/5 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Calculating sky paths...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] gap-4 p-8">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div
        ref={containerRef}
        className="w-full h-[600px] bg-black cursor-move relative"
        style={{ minHeight: "600px" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Control Buttons */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 bg-black/50 p-2 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setFov(f => Math.max(10, f - 10))}
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4 text-white" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setFov(f => Math.min(120, f + 10))}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4 text-white" />
          </Button>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleReset}
          title="Reset View"
        >
          <RotateCcw className="h-4 w-4 text-white" />
        </Button>
      </div>

      {/* View Direction Indicator */}
      <div className="absolute top-4 left-4 bg-black/50 p-3 rounded backdrop-blur-sm text-white text-sm">
        <div className="flex items-center gap-2 mb-1">
          <Compass className="h-4 w-4" />
          <span className="font-semibold">{viewDirection.cardinal}</span>
        </div>
        <div className="text-xs text-white/70 space-y-0.5">
          <div>Az: {viewDirection.azimuth}°</div>
          <div>Alt: {viewDirection.altitude}°</div>
          <div>FOV: {fov}°</div>
        </div>
      </div>

      {/* Observer Info */}
      <div className="absolute bottom-4 left-4 text-white/50 text-xs pointer-events-none">
        <div>Observer: {observerLat.toFixed(2)}°, {observerLon.toFixed(2)}°</div>
        <div className="mt-1">
          {startDate.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>

      {/* Object Legend */}
      {skyPaths && skyPaths.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-black/50 p-3 rounded backdrop-blur-sm text-white text-xs max-w-xs">
          <div className="font-semibold mb-2">Objects</div>
          <div className="space-y-1">
            {skyPaths.map((path, idx) => (
              <div key={path.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[idx % colors.length] }}
                />
                <span>Object {path.id}</span>
                <span className="text-white/50">
                  ({path.points.filter(p => p.visible).length} visible points)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/30 text-sm text-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        Drag to pan • Scroll to zoom
      </div>
    </div>
  );
}
