/**
 * CAD Client SDK
 *
 * Type-safe wrapper for communicating with the OCCT Worker.
 * Provides a Promise-based API that handles message passing,
 * request/response correlation, and error handling.
 */

import type {
  WorkerReq,
  WorkerRes,
  BuildReq,
  BuildRes,
  ExportReq,
  ExportRes,
  ImportReq,
  ImportRes,
  ProgressEvent,
  LogEvent,
  Err,
} from '../types/worker-protocol';
import type { ParamSchema } from '../types/param-schema';

// ===== CLIENT CONFIGURATION =====

export interface CADClientConfig {
  workerPath?: string;
  onProgress?: (event: ProgressEvent) => void;
  onLog?: (event: LogEvent) => void;
  enableLogging?: boolean;
}

const DEFAULT_CONFIG: CADClientConfig = {
  workerPath: '/src/cad/workers/occt.worker.ts',
  enableLogging: true,
};

// ===== CLIENT CLASS =====

export class CADClient {
  private worker: Worker | null = null;
  private config: CADClientConfig;
  private isInitialized = false;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
    }
  >();

  constructor(config: CADClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the CAD Worker and load OpenCascade WASM
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        // Create Worker from module path
        // Note: In Vite, we use new Worker with { type: 'module' }
        this.worker = new Worker(
          new URL('../workers/occt.worker.ts', import.meta.url),
          { type: 'module' }
        );

        // Set up message handler
        this.worker.onmessage = (event: MessageEvent<WorkerRes>) => {
          this.handleWorkerMessage(event.data);
        };

        this.worker.onerror = (error) => {
          console.error('CAD Worker error:', error);
          reject(new Error(`Worker error: ${error.message}`));
        };

        // Send init request
        const reqId = this.requestId++;
        this.pendingRequests.set(reqId, {
          resolve: () => {
            this.isInitialized = true;
            resolve();
          },
          reject,
        });

        const initReq: WorkerReq = { type: 'init' };
        this.worker.postMessage(initReq);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Build a CAD model from CADScript and parameters
   */
  async buildModel(
    cadScript: string,
    params: Record<string, any>,
    mesher?: {
      linearDeflection?: number;
      angularDeflection?: number;
    }
  ): Promise<BuildRes> {
    this.ensureInitialized();

    return this.sendRequest<BuildRes>({
      type: 'buildModel',
      cadScript,
      params,
      mesher,
    });
  }

  /**
   * Export a shape to STEP format
   */
  async exportSTEP(shapeId: string): Promise<ArrayBuffer> {
    this.ensureInitialized();

    const res = await this.sendRequest<ExportRes>({
      type: 'exportSTEP',
      shapeId,
    });

    return res.bytes;
  }

  /**
   * Export a shape to STL format
   */
  async exportSTL(shapeId: string, binary = true): Promise<ArrayBuffer> {
    this.ensureInitialized();

    const res = await this.sendRequest<ExportRes>({
      type: 'exportSTL',
      shapeId,
      binary,
    });

    return res.bytes;
  }

  /**
   * Import a STEP file
   */
  async importSTEP(
    stepBytes: ArrayBuffer,
    heal?: {
      sew?: boolean;
      fixSmallEdges?: boolean;
      tolerance?: number;
    }
  ): Promise<ImportRes> {
    this.ensureInitialized();

    return this.sendRequest<ImportRes>({
      type: 'importSTEP',
      stepBytes,
      heal,
    });
  }

  /**
   * Cancel current operation
   */
  async cancel(operationId?: string): Promise<void> {
    if (!this.worker) return;

    await this.sendRequest({
      type: 'cancel',
      operationId,
    });
  }

  /**
   * Terminate the Worker and clean up resources
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.pendingRequests.clear();
    }
  }

  // ===== PRIVATE METHODS =====

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.worker) {
      throw new Error('CAD Client not initialized. Call init() first.');
    }
  }

  private sendRequest<T extends WorkerRes>(req: WorkerReq): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const reqId = this.requestId++;
      this.pendingRequests.set(reqId, { resolve, reject });

      this.worker.postMessage(req);
    });
  }

  private handleWorkerMessage(msg: WorkerRes): void {
    // Handle progress events
    if ('type' in msg && msg.type === 'progress') {
      const progressEvent = msg as ProgressEvent;
      if (this.config.onProgress) {
        this.config.onProgress(progressEvent);
      }
      if (this.config.enableLogging) {
        console.log(
          `[CAD Progress] ${progressEvent.operation}: ${(progressEvent.progress * 100).toFixed(0)}%`,
          progressEvent.message || ''
        );
      }
      return;
    }

    // Handle log events
    if ('type' in msg && msg.type === 'log') {
      const logEvent = msg as LogEvent;
      if (this.config.onLog) {
        this.config.onLog(logEvent);
      }
      if (this.config.enableLogging) {
        const method = logEvent.level === 'error' ? 'error' : logEvent.level === 'warn' ? 'warn' : 'log';
        console[method](`[CAD Worker]`, logEvent.message);
      }
      return;
    }

    // Handle responses and errors
    // Since we don't have request IDs in the protocol yet,
    // we'll just resolve the oldest pending request
    // TODO: Add requestId to protocol for proper correlation
    const oldest = this.pendingRequests.keys().next().value;
    if (oldest === undefined) {
      console.warn('Received worker message with no pending request:', msg);
      return;
    }

    const pending = this.pendingRequests.get(oldest);
    if (!pending) return;

    this.pendingRequests.delete(oldest);

    // Check if it's an error
    if ('ok' in msg && !msg.ok) {
      const err = msg as Err;
      const error = new Error(err.error);
      error.stack = err.stack;
      pending.reject(error);
      return;
    }

    // Success
    pending.resolve(msg);
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Create a singleton CAD client instance
 */
let globalClient: CADClient | null = null;

export function getCADClient(config?: CADClientConfig): CADClient {
  if (!globalClient) {
    globalClient = new CADClient(config);
  }
  return globalClient;
}

/**
 * Destroy the global CAD client instance
 */
export function destroyCADClient(): void {
  if (globalClient) {
    globalClient.terminate();
    globalClient = null;
  }
}

// ===== REACT HOOK (Optional) =====

/**
 * React hook for using the CAD client
 * This will be useful for components that need to build models
 */
export function useCADClient(config?: CADClientConfig) {
  const [client] = useState(() => new CADClient(config));
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    client
      .init()
      .then(() => {
        if (mounted) setIsReady(true);
      })
      .catch((err) => {
        if (mounted) setError(err);
      });

    return () => {
      mounted = false;
      client.terminate();
    };
  }, [client]);

  return { client, isReady, error };
}

// Re-export for convenience
import { useState, useEffect } from 'react';
