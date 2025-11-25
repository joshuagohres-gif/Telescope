import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface TrajectoryPoint {
  t: number;
  x: number;
  y: number;
  z: number;
}

interface SolarSystemTopDownViewProps {
  objectIds: number[];
  startDate: Date;
  endDate: Date;
}

export function SolarSystemTopDownView({
  objectIds,
  startDate,
  endDate,
}: SolarSystemTopDownViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    objects: Map<number, THREE.Group>; // Store groups for each object (orbit + marker)
    planets: THREE.Group;
  } | null>(null);

  const [scale, setScale] = useState(20); // AU view width

  // Fetch trajectories for all selected objects
  const { data: trajectories, isLoading } = useQuery({
    queryKey: ["trajectories", objectIds, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (objectIds.length === 0) return [];
      const promises = objectIds.map(async (id) => {
        const params = new URLSearchParams();
        params.set("start_date", startDate.toISOString());
        params.set("end_date", endDate.toISOString());
        params.set("step_days", "2.0"); // Lower res for 2D view ok

        const response = await fetch(
          `/api/sky-visualizers/objects/${id}/trajectory?${params}`
        );
        if (!response.ok) return { id, points: [] };
        const result = await response.json();
        return { id, points: result.data as TrajectoryPoint[] };
      });
      return Promise.all(promises);
    },
    enabled: objectIds.length > 0,
  });

  // Initialize Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 600;
    const aspect = width / height;

    // Orthographic Camera: left, right, top, bottom, near, far
    const viewSize = scale;
    const camera = new THREE.OrthographicCamera(
      -viewSize * aspect / 2,
      viewSize * aspect / 2,
      viewSize / 2,
      -viewSize / 2,
      1,
      1000
    );
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b15);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // Add Sun
    const sunGeo = new THREE.SphereGeometry(0.2, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sun);

    // Grid (AU)
    const gridHelper = new THREE.GridHelper(100, 100, 0x333333, 0x111111);
    scene.add(gridHelper);
    // Rotate grid to be on XY plane? No, default is XZ.
    // Top down view: usually we look from +Y or +Z.
    // Orbital data is usually heliocentric ecliptic (x, y in plane, z normal).
    // So we look from +Z. X is right, Y is up.
    // GridHelper is on XZ plane. We need XY grid.
    gridHelper.rotation.x = Math.PI / 2;

    // Planet group
    const planetsGroup = new THREE.Group();
    scene.add(planetsGroup);

    // Add major planets orbits (approximated circles for context)
    const majorPlanets = [
      { name: "Mercury", a: 0.39, color: 0xaaaaaa },
      { name: "Venus", a: 0.72, color: 0xffcc00 },
      { name: "Earth", a: 1.00, color: 0x0000ff },
      { name: "Mars", a: 1.52, color: 0xff0000 },
      { name: "Jupiter", a: 5.20, color: 0xffaa00 },
      { name: "Saturn", a: 9.58, color: 0xddddaa },
    ];

    majorPlanets.forEach(p => {
      const orbitCurve = new THREE.EllipseCurve(
        0, 0,            // ax, aY
        p.a, p.a,        // xRadius, yRadius
        0, 2 * Math.PI,  // aStartAngle, aEndAngle
        false,           // aClockwise
        0                // aRotation
      );
      const pts = orbitCurve.getPoints(64);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: p.color, transparent: true, opacity: 0.3 });
      const orbit = new THREE.Line(geo, mat);
      planetsGroup.add(orbit);
    });

    sceneRef.current = {
      scene,
      camera,
      renderer,
      objects: new Map(),
      planets: planetsGroup,
    };

    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 600;
      const asp = w / h;
      const cam = sceneRef.current.camera;
      cam.left = -scale * asp / 2;
      cam.right = scale * asp / 2;
      cam.top = scale / 2;
      cam.bottom = -scale / 2;
      cam.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;
      requestAnimationFrame(animate);
      sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera);
    };
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (sceneRef.current && containerRef.current) {
        containerRef.current.removeChild(sceneRef.current.renderer.domElement);
        sceneRef.current.renderer.dispose();
      }
    };
  }, []); // Init once

  // Update Scale
  useEffect(() => {
    if (!sceneRef.current || !containerRef.current) return;
    const { camera } = sceneRef.current;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 600;
    const aspect = width / height;
    
    camera.left = -scale * aspect / 2;
    camera.right = scale * aspect / 2;
    camera.top = scale / 2;
    camera.bottom = -scale / 2;
    camera.updateProjectionMatrix();
  }, [scale]);

  // Update Trajectories
  useEffect(() => {
    if (!sceneRef.current || !trajectories) return;
    const { scene, objects } = sceneRef.current;

    // Clear old objects
    objects.forEach(group => scene.remove(group));
    objects.clear();

    // Colors for objects
    const colors = [0x00ff00, 0xff00ff, 0x00ffff, 0xffff00, 0xff0000];

    trajectories.forEach((traj, idx) => {
        if (!traj.points.length) return;

        const group = new THREE.Group();
        const color = colors[idx % colors.length];

        // Line
        const points = traj.points.map(p => new THREE.Vector3(p.x, p.y, 0)); // Flatten to 2D
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color });
        const line = new THREE.Line(geometry, material);
        group.add(line);

        // Current position marker (last point)
        const lastPoint = points[points.length - 1];
        const markerGeo = new THREE.SphereGeometry(scale / 100, 16, 16); // Scale marker size with view
        const markerMat = new THREE.MeshBasicMaterial({ color });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.copy(lastPoint);
        group.add(marker);

        scene.add(group);
        objects.set(traj.id, group);
    });

  }, [trajectories, scale]);


  if (isLoading && objectIds.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] bg-black/5 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Calculating orbits...</p>
      </div>
    );
  }

  return (
    <div className="relative">
        <div
            ref={containerRef}
            className="w-full h-[600px] bg-black"
        />
        
        <div className="absolute top-4 right-4 flex flex-col gap-2 bg-black/50 p-2 rounded backdrop-blur-sm">
            <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={() => setScale(s => Math.max(1, s - 5))}>
                    <ZoomIn className="h-4 w-4 text-white" />
                </Button>
                <span className="text-white text-xs w-12 text-center">{scale} AU</span>
                <Button size="icon" variant="ghost" onClick={() => setScale(s => Math.min(100, s + 5))}>
                    <ZoomOut className="h-4 w-4 text-white" />
                </Button>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setScale(20)}>
                <RotateCcw className="h-4 w-4 text-white" />
            </Button>
        </div>
        
        <div className="absolute bottom-4 left-4 text-white/50 text-xs pointer-events-none">
            Top-Down Heliocentric View
        </div>
    </div>
  );
}
