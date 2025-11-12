/**
 * Optimized CAD Client
 *
 * Enhanced CAD client with caching, worker pooling, and telemetry.
 */

import { CADClient, type CADClientConfig } from './cad-client';
import { getMeshCache } from '../cache/mesh-cache';
import { getWorkerPool } from './worker-pool';
import { getTelemetry, monitor } from '../telemetry/metrics';
import type { BuildRes, WorkerRequest } from '../types/worker-protocol';

export interface OptimizedCADClientConfig extends CADClientConfig {
  enableCache?: boolean;
  enableWorkerPool?: boolean;
  enableTelemetry?: boolean;
}

export class OptimizedCADClient {
  private client: CADClient;
  private config: OptimizedCADClientConfig;
  private cache = getMeshCache();
  private workerPool = getWorkerPool();
  private telemetry = getTelemetry();

  constructor(config: OptimizedCADClientConfig = {}) {
    this.config = {
      enableCache: true,
      enableWorkerPool: true,
      enableTelemetry: true,
      ...config,
    };

    this.client = new CADClient(config);
  }

  /**
   * Initialize the client
   */
  async init(): Promise<void> {
    const perf = monitor('CADClient init');

    try {
      await this.client.init();
      perf.end();
    } catch (error: any) {
      if (this.config.enableTelemetry) {
        this.telemetry.recordError({
          errorType: 'worker',
          message: `Init failed: ${error.message}`,
          stack: error.stack,
        });
      }
      throw error;
    }
  }

  /**
   * Build a CAD model with caching
   */
  async buildModel(
    cadScript: string,
    params: Record<string, any>,
    mesher?: { linearDeflection?: number; angularDeflection?: number }
  ): Promise<BuildRes> {
    const perf = monitor('Build model');
    const startTime = Date.now();
    let cacheHit = false;

    try {
      // Check cache first
      if (this.config.enableCache) {
        const cached = await this.cache.get(cadScript, params);
        if (cached) {
          cacheHit = true;
          const buildRes: BuildRes = {
            type: 'buildModel',
            ok: true,
            shapeId: cached.key,
            triCount: cached.metadata.triCount,
            mesh: cached.meshData,
            edges: cached.edges,
            topologyMap: {},
            bbox: cached.metadata.bbox || { min: [0, 0, 0], max: [0, 0, 0] },
            volume: cached.metadata.volume,
            surfaceArea: cached.metadata.surfaceArea,
          };

          const duration = perf.end();

          if (this.config.enableTelemetry) {
            this.telemetry.recordBuild({
              cadScript,
              paramCount: Object.keys(params).length,
              buildDuration: duration,
              triCount: cached.metadata.triCount,
              volume: cached.metadata.volume,
              surfaceArea: cached.metadata.surfaceArea,
              cacheHit: true,
            });

            this.telemetry.recordCache({
              operation: 'hit',
              entryCount: 0,
              totalSizeMB: 0,
            });
          }

          return buildRes;
        }

        // Cache miss
        if (this.config.enableTelemetry) {
          this.telemetry.recordCache({
            operation: 'miss',
            entryCount: 0,
            totalSizeMB: 0,
          });
        }
      }

      // Build with worker pool
      const result = await this.client.buildModel(cadScript, params, mesher);

      const duration = Date.now() - startTime;

      // Cache the result
      if (this.config.enableCache && result.ok) {
        await this.cache.set(
          cadScript,
          params,
          result.mesh,
          {
            triCount: result.triCount,
            volume: result.volume,
            surfaceArea: result.surfaceArea,
            bbox: result.bbox,
          },
          result.edges
        );

        if (this.config.enableTelemetry) {
          this.telemetry.recordCache({
            operation: 'set',
            entryCount: 0,
            totalSizeMB: 0,
          });
        }
      }

      // Record telemetry
      if (this.config.enableTelemetry) {
        if (result.ok) {
          this.telemetry.recordBuild({
            cadScript,
            paramCount: Object.keys(params).length,
            buildDuration: duration,
            triCount: result.triCount,
            volume: result.volume,
            surfaceArea: result.surfaceArea,
            cacheHit: false,
          });
        } else {
          this.telemetry.recordError({
            errorType: 'build',
            message: result.error,
            context: { cadScript, params },
          });
        }
      }

      perf.end();
      return result;
    } catch (error: any) {
      if (this.config.enableTelemetry) {
        this.telemetry.recordError({
          errorType: 'build',
          message: error.message,
          stack: error.stack,
          context: { cadScript, params },
        });
      }
      throw error;
    }
  }

  /**
   * Export to STEP format
   */
  async exportSTEP(
    shapeId: string,
    options?: { schema?: 'AP214' | 'AP242' }
  ): Promise<ArrayBuffer> {
    const perf = monitor('Export STEP');

    try {
      const result = await this.client.exportSTEP(shapeId, options);
      perf.end();
      return result;
    } catch (error: any) {
      if (this.config.enableTelemetry) {
        this.telemetry.recordError({
          errorType: 'build',
          message: `STEP export failed: ${error.message}`,
          context: { shapeId, options },
        });
      }
      throw error;
    }
  }

  /**
   * Export to STL format
   */
  async exportSTL(
    shapeId: string,
    options?: { binary?: boolean; linearDeflection?: number; angularDeflection?: number }
  ): Promise<ArrayBuffer> {
    const perf = monitor('Export STL');

    try {
      const result = await this.client.exportSTL(shapeId, options);
      perf.end();
      return result;
    } catch (error: any) {
      if (this.config.enableTelemetry) {
        this.telemetry.recordError({
          errorType: 'build',
          message: `STL export failed: ${error.message}`,
          context: { shapeId, options },
        });
      }
      throw error;
    }
  }

  /**
   * Import from STEP format
   */
  async importSTEP(
    stepBytes: ArrayBuffer,
    options?: { heal?: { sewing?: boolean; fixShape?: boolean } }
  ): Promise<{ shapeId: string; stats: any }> {
    const perf = monitor('Import STEP');

    try {
      const result = await this.client.importSTEP(stepBytes, options);
      perf.end();
      return result;
    } catch (error: any) {
      if (this.config.enableTelemetry) {
        this.telemetry.recordError({
          errorType: 'build',
          message: `STEP import failed: ${error.message}`,
        });
      }
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    if (!this.config.enableCache) {
      return { entryCount: 0, totalSizeMB: 0 };
    }
    return await this.cache.getStats();
  }

  /**
   * Clear the cache
   */
  async clearCache(): Promise<void> {
    if (this.config.enableCache) {
      await this.cache.clear();
    }
  }

  /**
   * Get telemetry summary
   */
  getTelemetrySummary() {
    if (!this.config.enableTelemetry) {
      return null;
    }
    return this.telemetry.getSummary();
  }

  /**
   * Get worker pool stats
   */
  getWorkerPoolStats() {
    if (!this.config.enableWorkerPool) {
      return null;
    }
    return this.workerPool.getStats();
  }

  /**
   * Export telemetry data
   */
  exportTelemetry(): string | null {
    if (!this.config.enableTelemetry) {
      return null;
    }
    return this.telemetry.exportJSON();
  }

  /**
   * Terminate the client
   */
  terminate(): void {
    this.client.terminate();
    if (this.config.enableWorkerPool) {
      this.workerPool.terminate();
    }
  }
}
