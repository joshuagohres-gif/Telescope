/**
 * Progressive Meshing / Level of Detail (LOD)
 *
 * Generates and manages multiple mesh resolutions for performance optimization.
 */

import * as THREE from 'three';

export interface LODLevel {
  distance: number; // Camera distance threshold
  linearDeflection: number;
  angularDeflection: number;
  mesh?: THREE.Mesh;
  loading?: boolean;
}

export interface ProgressiveMeshConfig {
  levels?: LODLevel[];
  autoGenerate?: boolean;
  transitionSpeed?: number;
}

const DEFAULT_LOD_LEVELS: LODLevel[] = [
  {
    distance: 0,
    linearDeflection: 0.05, // High detail
    angularDeflection: 0.3,
  },
  {
    distance: 50,
    linearDeflection: 0.1, // Medium detail
    angularDeflection: 0.5,
  },
  {
    distance: 100,
    linearDeflection: 0.3, // Low detail
    angularDeflection: 1.0,
  },
  {
    distance: 200,
    linearDeflection: 0.5, // Very low detail
    angularDeflection: 1.5,
  },
];

export class ProgressiveMesh {
  private lodGroup: THREE.LOD;
  private levels: LODLevel[];
  private config: ProgressiveMeshConfig;
  private currentLODIndex: number = 0;

  constructor(config: ProgressiveMeshConfig = {}) {
    this.config = {
      autoGenerate: true,
      transitionSpeed: 0.2,
      ...config,
    };

    this.levels = config.levels || DEFAULT_LOD_LEVELS;
    this.lodGroup = new THREE.LOD();
  }

  /**
   * Add a mesh for a specific LOD level
   */
  addLevel(levelIndex: number, mesh: THREE.Mesh): void {
    const level = this.levels[levelIndex];
    if (!level) {
      console.error(`[ProgressiveMesh] Invalid level index: ${levelIndex}`);
      return;
    }

    level.mesh = mesh;
    level.loading = false;

    this.lodGroup.addLevel(mesh, level.distance);

    console.log(
      `[ProgressiveMesh] Added LOD level ${levelIndex} at distance ${level.distance}`
    );
  }

  /**
   * Get the LOD group for adding to scene
   */
  getLODGroup(): THREE.LOD {
    return this.lodGroup;
  }

  /**
   * Get LOD level configuration
   */
  getLevel(index: number): LODLevel | undefined {
    return this.levels[index];
  }

  /**
   * Get all LOD levels
   */
  getLevels(): LODLevel[] {
    return this.levels;
  }

  /**
   * Update LOD based on camera distance
   */
  update(camera: THREE.Camera): void {
    this.lodGroup.update(camera);

    // Determine current LOD level
    const cameraDistance = this.lodGroup.position.distanceTo(camera.position);
    let newLODIndex = 0;

    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (cameraDistance >= this.levels[i].distance) {
        newLODIndex = i;
        break;
      }
    }

    if (newLODIndex !== this.currentLODIndex) {
      this.currentLODIndex = newLODIndex;
      this.onLODChange(newLODIndex);
    }
  }

  /**
   * Called when LOD level changes
   */
  private onLODChange(newIndex: number): void {
    console.log(`[ProgressiveMesh] LOD changed to level ${newIndex}`);

    // Trigger loading of next level if not already loaded
    if (this.config.autoGenerate) {
      const nextLevel = this.levels[newIndex + 1];
      if (nextLevel && !nextLevel.mesh && !nextLevel.loading) {
        console.log(`[ProgressiveMesh] Preloading next LOD level ${newIndex + 1}`);
        // Emit event for preloading
        this.lodGroup.dispatchEvent({ type: 'preload-lod', level: newIndex + 1 });
      }
    }
  }

  /**
   * Get current LOD level index
   */
  getCurrentLODIndex(): number {
    return this.currentLODIndex;
  }

  /**
   * Set position of LOD group
   */
  setPosition(x: number, y: number, z: number): void {
    this.lodGroup.position.set(x, y, z);
  }

  /**
   * Dispose of all meshes
   */
  dispose(): void {
    for (const level of this.levels) {
      if (level.mesh) {
        level.mesh.geometry.dispose();
        if (Array.isArray(level.mesh.material)) {
          level.mesh.material.forEach((m) => m.dispose());
        } else {
          level.mesh.material.dispose();
        }
      }
    }

    this.lodGroup.clear();
  }
}

/**
 * Simplify mesh geometry (basic implementation)
 * For production, use a proper mesh simplification library
 */
export function simplifyMesh(
  geometry: THREE.BufferGeometry,
  targetReduction: number
): THREE.BufferGeometry {
  // This is a placeholder - in production, use a library like THREE.SimplifyModifier
  // or implement a proper mesh decimation algorithm

  const simplified = geometry.clone();

  // For now, just return the original geometry
  // TODO: Implement proper mesh simplification
  console.warn('[ProgressiveMesh] Mesh simplification not yet implemented');

  return simplified;
}

/**
 * Calculate appropriate LOD distances based on model bounds
 */
export function calculateLODDistances(bbox: {
  min: [number, number, number];
  max: [number, number, number];
}): number[] {
  const min = new THREE.Vector3(...bbox.min);
  const max = new THREE.Vector3(...bbox.max);
  const size = max.distanceTo(min);

  return [
    0,
    size * 2, // Medium detail at 2x model size
    size * 5, // Low detail at 5x model size
    size * 10, // Very low detail at 10x model size
  ];
}

/**
 * Generate LOD levels based on model size
 */
export function generateLODLevels(bbox: {
  min: [number, number, number];
  max: [number, number, number];
}): LODLevel[] {
  const distances = calculateLODDistances(bbox);

  return [
    {
      distance: distances[0],
      linearDeflection: 0.05,
      angularDeflection: 0.3,
    },
    {
      distance: distances[1],
      linearDeflection: 0.1,
      angularDeflection: 0.5,
    },
    {
      distance: distances[2],
      linearDeflection: 0.3,
      angularDeflection: 1.0,
    },
    {
      distance: distances[3],
      linearDeflection: 0.5,
      angularDeflection: 1.5,
    },
  ];
}
