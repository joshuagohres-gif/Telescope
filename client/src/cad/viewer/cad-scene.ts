/**
 * CAD Scene Manager
 *
 * Manages the Three.js scene for CAD model visualization.
 * Handles mesh rendering, edges, section planes, and measurements.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// ===== TYPES =====

export interface CadSceneConfig {
  antialias?: boolean;
  pixelRatio?: number;
  backgroundColor?: number;
  gridSize?: number;
  gridDivisions?: number;
  showAxes?: boolean;
  showGrid?: boolean;
  showEdges?: boolean;
}

export interface MeshData {
  vertices: Float32Array;  // [x, y, z, nx, ny, nz, ...]
  indices?: Uint32Array;
  edges?: Float32Array;    // [x1, y1, z1, x2, y2, z2, ...]
}

export interface SectionPlane {
  enabled: boolean;
  position: THREE.Vector3;
  normal: THREE.Vector3;
}

export interface Measurement {
  id: string;
  type: 'distance' | 'angle' | 'radius';
  points: THREE.Vector3[];
  value: number;
  label: string;
}

// ===== DEFAULT CONFIG =====

const DEFAULT_CONFIG: Required<CadSceneConfig> = {
  antialias: true,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
  backgroundColor: 0x1a1a1a,
  gridSize: 1000,
  gridDivisions: 100,
  showAxes: true,
  showGrid: true,
  showEdges: true,
};

// ===== CAD SCENE MANAGER =====

export class CadScene {
  private container: HTMLElement;
  private config: Required<CadSceneConfig>;

  // Three.js core
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  // Scene objects
  private meshGroup: THREE.Group;
  private edgesGroup: THREE.Group;
  private gridHelper: THREE.GridHelper | null = null;
  private axesHelper: THREE.AxesHelper | null = null;

  // Lighting
  private ambientLight: THREE.AmbientLight;
  private directionalLights: THREE.DirectionalLight[] = [];

  // Section plane
  private sectionPlane: SectionPlane | null = null;
  private sectionHelper: THREE.PlaneHelper | null = null;

  // Measurements
  private measurements: Map<string, Measurement> = new Map();
  private measurementObjects: THREE.Group;

  // State
  private animationFrameId: number | null = null;
  private isDisposed = false;

  constructor(container: HTMLElement, config: CadSceneConfig = {}) {
    this.container = container;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.backgroundColor);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      10000
    );
    this.camera.position.set(200, 200, 200);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.config.antialias,
      alpha: true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(this.config.pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 5000;

    // Groups
    this.meshGroup = new THREE.Group();
    this.meshGroup.name = 'CAD_Mesh';
    this.scene.add(this.meshGroup);

    this.edgesGroup = new THREE.Group();
    this.edgesGroup.name = 'CAD_Edges';
    this.scene.add(this.edgesGroup);

    this.measurementObjects = new THREE.Group();
    this.measurementObjects.name = 'Measurements';
    this.scene.add(this.measurementObjects);

    // Lighting
    this.setupLighting();

    // Scene helpers
    if (this.config.showGrid) {
      this.gridHelper = new THREE.GridHelper(
        this.config.gridSize,
        this.config.gridDivisions,
        0x444444,
        0x222222
      );
      this.scene.add(this.gridHelper);
    }

    if (this.config.showAxes) {
      this.axesHelper = new THREE.AxesHelper(100);
      this.scene.add(this.axesHelper);
    }

    // Handle window resize
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);

    // Start render loop
    this.animate();
  }

  // ===== LIGHTING =====

  private setupLighting(): void {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    // Directional lights (3-point lighting)
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(100, 100, 100);
    keyLight.castShadow = true;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 500;
    keyLight.shadow.camera.left = -100;
    keyLight.shadow.camera.right = 100;
    keyLight.shadow.camera.top = 100;
    keyLight.shadow.camera.bottom = -100;
    this.scene.add(keyLight);
    this.directionalLights.push(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-100, 50, -50);
    this.scene.add(fillLight);
    this.directionalLights.push(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(0, 100, -100);
    this.scene.add(backLight);
    this.directionalLights.push(backLight);
  }

  // ===== MESH LOADING =====

  /**
   * Load mesh data from Worker into the scene
   */
  loadMesh(data: MeshData): void {
    // Clear existing mesh
    this.clearMesh();

    // Create geometry from interleaved vertex data
    const geometry = new THREE.BufferGeometry();

    // Extract positions and normals from interleaved data
    const vertexCount = data.vertices.length / 6;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      positions[i * 3] = data.vertices[i * 6];
      positions[i * 3 + 1] = data.vertices[i * 6 + 1];
      positions[i * 3 + 2] = data.vertices[i * 6 + 2];

      normals[i * 3] = data.vertices[i * 6 + 3];
      normals[i * 3 + 1] = data.vertices[i * 6 + 4];
      normals[i * 3 + 2] = data.vertices[i * 6 + 5];
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    if (data.indices) {
      geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    }

    geometry.computeBoundingSphere();

    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a90e2,
      metalness: 0.3,
      roughness: 0.6,
      side: THREE.DoubleSide,
      flatShading: false,
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.meshGroup.add(mesh);

    // Load edges if available
    if (data.edges && this.config.showEdges) {
      this.loadEdges(data.edges);
    }

    // Fit camera to view the model
    this.fitCameraToModel();
  }

  /**
   * Load edge geometry
   */
  private loadEdges(edgeData: Float32Array): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(edgeData, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 1,
    });

    const edges = new THREE.LineSegments(geometry, material);
    this.edgesGroup.add(edges);
  }

  /**
   * Clear all meshes from the scene
   */
  clearMesh(): void {
    this.meshGroup.clear();
    this.edgesGroup.clear();
  }

  // ===== CAMERA CONTROLS =====

  /**
   * Fit camera to view the entire model
   */
  fitCameraToModel(): void {
    const box = new THREE.Box3();
    box.setFromObject(this.meshGroup);

    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const fov = this.camera.fov * (Math.PI / 180);
    let cameraDistance = maxDim / (2 * Math.tan(fov / 2));
    cameraDistance *= 1.5; // Add some padding

    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    this.camera.position.copy(direction.multiplyScalar(cameraDistance).add(center));
    this.controls.target.copy(center);
    this.controls.update();
  }

  /**
   * Reset camera to default view
   */
  resetCamera(): void {
    this.camera.position.set(200, 200, 200);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.fitCameraToModel();
  }

  /**
   * Set camera view (top, front, right, iso)
   */
  setCameraView(view: 'top' | 'front' | 'right' | 'iso'): void {
    const box = new THREE.Box3().setFromObject(this.meshGroup);
    const center = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
    const size = box.isEmpty() ? 100 : box.getSize(new THREE.Vector3()).length();

    const distance = size * 1.5;

    const positions: Record<string, THREE.Vector3> = {
      top: new THREE.Vector3(center.x, center.y + distance, center.z),
      front: new THREE.Vector3(center.x, center.y, center.z + distance),
      right: new THREE.Vector3(center.x + distance, center.y, center.z),
      iso: new THREE.Vector3(center.x + distance, center.y + distance, center.z + distance),
    };

    this.camera.position.copy(positions[view]);
    this.controls.target.copy(center);
    this.controls.update();
  }

  // ===== SECTION PLANES =====

  /**
   * Enable/disable section plane
   */
  setSectionPlane(enabled: boolean, position?: THREE.Vector3, normal?: THREE.Vector3): void {
    if (!enabled) {
      this.sectionPlane = null;
      if (this.sectionHelper) {
        this.scene.remove(this.sectionHelper);
        this.sectionHelper = null;
      }
      this.renderer.clippingPlanes = [];
      return;
    }

    const pos = position || new THREE.Vector3(0, 0, 0);
    const norm = normal || new THREE.Vector3(0, 1, 0);

    this.sectionPlane = {
      enabled: true,
      position: pos,
      normal: norm,
    };

    // Create Three.js clipping plane
    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(norm, pos);

    this.renderer.clippingPlanes = [plane];
    this.renderer.localClippingEnabled = true;

    // Visual helper
    if (this.sectionHelper) {
      this.scene.remove(this.sectionHelper);
    }
    this.sectionHelper = new THREE.PlaneHelper(plane, 200, 0xff0000);
    this.scene.add(this.sectionHelper);
  }

  /**
   * Update section plane position
   */
  updateSectionPlane(position: THREE.Vector3): void {
    if (!this.sectionPlane) return;
    this.sectionPlane.position = position;
    this.setSectionPlane(true, position, this.sectionPlane.normal);
  }

  // ===== MEASUREMENTS =====

  /**
   * Add a distance measurement
   */
  addDistanceMeasurement(id: string, point1: THREE.Vector3, point2: THREE.Vector3): void {
    const distance = point1.distanceTo(point2);

    const measurement: Measurement = {
      id,
      type: 'distance',
      points: [point1, point2],
      value: distance,
      label: `${distance.toFixed(2)} mm`,
    };

    this.measurements.set(id, measurement);
    this.renderMeasurement(measurement);
  }

  /**
   * Render a measurement in the scene
   */
  private renderMeasurement(measurement: Measurement): void {
    const group = new THREE.Group();
    group.name = `measurement_${measurement.id}`;

    if (measurement.type === 'distance') {
      const [p1, p2] = measurement.points;

      // Line
      const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const material = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 2 });
      const line = new THREE.Line(geometry, material);
      group.add(line);

      // Endpoint spheres
      const sphereGeometry = new THREE.SphereGeometry(1, 16, 16);
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });

      const sphere1 = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere1.position.copy(p1);
      group.add(sphere1);

      const sphere2 = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere2.position.copy(p2);
      group.add(sphere2);

      // TODO: Add text label using THREE.Sprite or CSS2DRenderer
    }

    this.measurementObjects.add(group);
  }

  /**
   * Remove a measurement
   */
  removeMeasurement(id: string): void {
    this.measurements.delete(id);
    const obj = this.measurementObjects.getObjectByName(`measurement_${id}`);
    if (obj) {
      this.measurementObjects.remove(obj);
    }
  }

  /**
   * Clear all measurements
   */
  clearMeasurements(): void {
    this.measurements.clear();
    this.measurementObjects.clear();
  }

  // ===== VISIBILITY CONTROLS =====

  setMeshVisible(visible: boolean): void {
    this.meshGroup.visible = visible;
  }

  setEdgesVisible(visible: boolean): void {
    this.edgesGroup.visible = visible;
  }

  setGridVisible(visible: boolean): void {
    if (this.gridHelper) {
      this.gridHelper.visible = visible;
    }
  }

  setAxesVisible(visible: boolean): void {
    if (this.axesHelper) {
      this.axesHelper.visible = visible;
    }
  }

  // ===== RENDERING =====

  private animate = (): void => {
    if (this.isDisposed) return;

    this.animationFrameId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private handleResize(): void {
    if (this.isDisposed) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // ===== EXPORT =====

  /**
   * Take a screenshot of the current view
   */
  takeScreenshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  // ===== CLEANUP =====

  dispose(): void {
    this.isDisposed = true;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.handleResize);

    this.controls.dispose();
    this.renderer.dispose();

    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }

    // Dispose geometries and materials
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      }
    });
  }

  // ===== GETTERS =====

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getControls(): OrbitControls {
    return this.controls;
  }
}
