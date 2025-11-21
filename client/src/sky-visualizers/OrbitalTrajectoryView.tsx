import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import * as THREE from "three";

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
  objectId: number;
  startDate: Date;
  endDate: Date;
}

export function OrbitalTrajectoryView({
  objectId,
  startDate,
  endDate,
}: OrbitalTrajectoryViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls?: any;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: trajectory, isLoading } = useQuery({
    queryKey: [
      "trajectory",
      objectId,
      startDate.toISOString(),
      endDate.toISOString(),
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("start_date", startDate.toISOString());
      params.set("end_date", endDate.toISOString());
      params.set("step_days", "1.0");

      const response = await fetch(
        `/api/sky-visualizers/objects/${objectId}/trajectory?${params}`
      );
      if (!response.ok) throw new Error("Failed to fetch trajectory");
      const result = await response.json();
      return result.data as TrajectoryPoint[];
    },
    enabled: !!objectId,
  });

  useEffect(() => {
    if (!containerRef.current || !trajectory) return;

    // Initialize Three.js scene
    if (!sceneRef.current) {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight || 600;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000011);

      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.set(0, 0, 50);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      containerRef.current.appendChild(renderer.domElement);

      // Add Sun at origin
      const sunGeometry = new THREE.SphereGeometry(0.5, 32, 32);
      const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const sun = new THREE.Mesh(sunGeometry, sunMaterial);
      scene.add(sun);

      // Add light
      const light = new THREE.PointLight(0xffffff, 1, 100);
      light.position.set(0, 0, 0);
      scene.add(light);

      sceneRef.current = { scene, camera, renderer };

      // Handle resize
      const handleResize = () => {
        if (!containerRef.current || !sceneRef.current) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight || 600;
        sceneRef.current.camera.aspect = width / height;
        sceneRef.current.camera.updateProjectionMatrix();
        sceneRef.current.renderer.setSize(width, height);
      };
      window.addEventListener("resize", handleResize);
    }

    // Create trajectory line
    const points = trajectory.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const line = new THREE.Line(geometry, material);
    sceneRef.current.scene.add(line);

    // Add current position marker
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      const markerGeometry = new THREE.SphereGeometry(0.2, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(lastPoint);
      sceneRef.current.scene.add(marker);
    }

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;
      requestAnimationFrame(animate);
      sceneRef.current.renderer.render(
        sceneRef.current.scene,
        sceneRef.current.camera
      );
    };
    animate();

    return () => {
      // Cleanup
      if (sceneRef.current && containerRef.current) {
        containerRef.current.removeChild(sceneRef.current.renderer.domElement);
        sceneRef.current.renderer.dispose();
        sceneRef.current = null;
      }
    };
  }, [trajectory]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading trajectory...</p>
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
    <div
      ref={containerRef}
      className="w-full h-[600px] bg-background"
      style={{ minHeight: "600px" }}
    />
  );
}
