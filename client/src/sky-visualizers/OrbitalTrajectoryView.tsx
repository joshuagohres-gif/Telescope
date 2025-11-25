import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, RotateCcw } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Button } from "@/components/ui/button";

interface TrajectoryPoint {
  t: number;
  x: number;
  y: number;
  z: number;
  ra?: number;
  dec?: number;
  distance?: number;
}

interface OrbitalTrajectoryViewProps {
  objectIds: number[];
  startDate: Date;
  endDate: Date;
}

export function OrbitalTrajectoryView({
  objectIds,
  startDate,
  endDate,
}: OrbitalTrajectoryViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    objects: Map<number, THREE.Group>;
  } | null>(null);
  
  const [error, setError] = useState<string | null>(null);

  // Fetch trajectories for all selected objects
  const { data: trajectories, isLoading } = useQuery({
    queryKey: ["trajectories", objectIds, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (objectIds.length === 0) return [];
      const promises = objectIds.map(async (id) => {
        const params = new URLSearchParams();
        params.set("start_date", startDate.toISOString());
        params.set("end_date", endDate.toISOString());
        params.set("step_days", "1.0");

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

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Three.js scene
    if (!sceneRef.current) {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight || 600;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000011);

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 30, 50);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      containerRef.current.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      // Add Sun
      const sunGeometry = new THREE.SphereGeometry(1, 32, 32);
      const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const sun = new THREE.Mesh(sunGeometry, sunMaterial);
      scene.add(sun);

      // Add light
      const light = new THREE.PointLight(0xffffff, 1, 100);
      light.position.set(0, 0, 0);
      scene.add(light);
      
      const ambientLight = new THREE.AmbientLight(0x404040);
      scene.add(ambientLight);

      // Ecliptic Grid
      const gridHelper = new THREE.GridHelper(100, 100, 0x333333, 0x111111);
      scene.add(gridHelper);

      sceneRef.current = { scene, camera, renderer, controls, objects: new Map() };

      const handleResize = () => {
        if (!containerRef.current || !sceneRef.current) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight || 600;
        sceneRef.current.camera.aspect = width / height;
        sceneRef.current.camera.updateProjectionMatrix();
        sceneRef.current.renderer.setSize(width, height);
      };
      window.addEventListener("resize", handleResize);

      // Animation loop
      const animate = () => {
        if (!sceneRef.current) return;
        requestAnimationFrame(animate);
        sceneRef.current.controls.update();
        sceneRef.current.renderer.render(
          sceneRef.current.scene,
          sceneRef.current.camera
        );
      };
      animate();
    }

    return () => {
       // Cleanup logic if needed
    };
  }, []);

  // Update Trajectories
  useEffect(() => {
    if (!sceneRef.current || !trajectories) return;
    const { scene, objects } = sceneRef.current;

    // Clear old objects
    objects.forEach(group => scene.remove(group));
    objects.clear();

    const colors = [0x00ff00, 0xff00ff, 0x00ffff, 0xffff00, 0xff0000];

    trajectories.forEach((traj, idx) => {
        if (!traj.points.length) return;

        const group = new THREE.Group();
        const color = colors[idx % colors.length];

        const points = traj.points.map((p) => new THREE.Vector3(p.x, p.z, -p.y)); 
        // Note: Orbital Simulator likely outputs x, y in plane, z normal. 
        // But ThreeJS uses Y up. So we map z->y, y->-z or similar? 
        // If simulator is heliocentric ecliptic: z is small (inclination).
        // x, y are the plane.
        // In ThreeJS default: x is right, y is up, z is towards viewer.
        // GridHelper is x, z plane.
        // So we map x->x, y->z, z->y.
        
        // Re-mapping to match grid:
        const mappedPoints = traj.points.map(p => new THREE.Vector3(p.x, p.z, p.y)); 

        const geometry = new THREE.BufferGeometry().setFromPoints(mappedPoints);
        const material = new THREE.LineBasicMaterial({ color });
        const line = new THREE.Line(geometry, material);
        group.add(line);

        const lastPoint = mappedPoints[mappedPoints.length - 1];
        const markerGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ color });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(lastPoint);
        group.add(marker);

        scene.add(group);
        objects.set(traj.id, group);
    });
  }, [trajectories]);

  const resetCamera = () => {
      if (sceneRef.current) {
          sceneRef.current.camera.position.set(0, 30, 50);
          sceneRef.current.camera.lookAt(0, 0, 0);
          sceneRef.current.controls.reset();
      }
  };

  if (isLoading && objectIds.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading trajectories...</p>
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
    <div className="relative">
        <div
            ref={containerRef}
            className="w-full h-[600px] bg-background"
            style={{ minHeight: "600px" }}
        />
        <div className="absolute top-4 right-4">
            <Button size="icon" variant="secondary" onClick={resetCamera} title="Reset Camera">
                <RotateCcw className="h-4 w-4" />
            </Button>
        </div>
    </div>
  );
}
