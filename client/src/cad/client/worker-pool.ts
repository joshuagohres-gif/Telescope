/**
 * Worker Pool
 *
 * Manages a pool of OCCT workers for parallel processing.
 */

import type { WorkerRequest, WorkerResponse } from '../types/worker-protocol';

interface PooledWorker {
  worker: Worker;
  busy: boolean;
  taskCount: number;
}

interface QueuedTask {
  request: WorkerRequest;
  resolve: (response: WorkerResponse) => void;
  reject: (error: Error) => void;
  priority: number;
}

export interface WorkerPoolConfig {
  maxWorkers?: number;
  workerTimeout?: number;
  enableLogging?: boolean;
}

export class WorkerPool {
  private workers: PooledWorker[] = [];
  private queue: QueuedTask[] = [];
  private maxWorkers: number;
  private workerTimeout: number;
  private enableLogging: boolean;
  private requestCounter = 0;

  constructor(config: WorkerPoolConfig = {}) {
    this.maxWorkers = config.maxWorkers || navigator.hardwareConcurrency || 4;
    this.workerTimeout = config.workerTimeout || 60000; // 60 seconds
    this.enableLogging = config.enableLogging ?? true;

    this.log(`Initializing worker pool with ${this.maxWorkers} workers`);
  }

  private log(...args: any[]): void {
    if (this.enableLogging) {
      console.log('[WorkerPool]', ...args);
    }
  }

  /**
   * Initialize the worker pool
   */
  async initialize(): Promise<void> {
    // Start with 1 worker, create more on demand
    await this.createWorker();
    this.log('Pool initialized with 1 worker');
  }

  /**
   * Create a new worker
   */
  private async createWorker(): Promise<PooledWorker> {
    const worker = new Worker(new URL('../workers/occt.worker.ts', import.meta.url), {
      type: 'module',
    });

    const pooledWorker: PooledWorker = {
      worker,
      busy: false,
      taskCount: 0,
    };

    // Wait for worker to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'));
      }, 10000);

      const handleMessage = (e: MessageEvent) => {
        const response = e.data as WorkerResponse;
        if (response.type === 'initialized') {
          clearTimeout(timeout);
          worker.removeEventListener('message', handleMessage);
          resolve();
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    this.workers.push(pooledWorker);
    this.log(`Worker created, pool size: ${this.workers.length}`);

    return pooledWorker;
  }

  /**
   * Get an available worker or create a new one
   */
  private async getWorker(): Promise<PooledWorker> {
    // Find an idle worker
    const idleWorker = this.workers.find((w) => !w.busy);
    if (idleWorker) {
      return idleWorker;
    }

    // Create a new worker if under max
    if (this.workers.length < this.maxWorkers) {
      return await this.createWorker();
    }

    // Wait for a worker to become available
    return new Promise<PooledWorker>((resolve) => {
      const checkInterval = setInterval(() => {
        const available = this.workers.find((w) => !w.busy);
        if (available) {
          clearInterval(checkInterval);
          resolve(available);
        }
      }, 50);
    });
  }

  /**
   * Execute a request with priority
   */
  async execute<T extends WorkerResponse>(
    request: WorkerRequest,
    priority: number = 0
  ): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      // Add to queue
      this.queue.push({ request, resolve: resolve as any, reject, priority });

      // Sort queue by priority (higher first)
      this.queue.sort((a, b) => b.priority - a.priority);

      // Process queue
      this.processQueue();
    });
  }

  /**
   * Process queued tasks
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) break;

      try {
        const worker = await this.getWorker();
        await this.executeOnWorker(worker, task.request, task.resolve, task.reject);
      } catch (error) {
        task.reject(error as Error);
      }
    }
  }

  /**
   * Execute a request on a specific worker
   */
  private async executeOnWorker(
    pooledWorker: PooledWorker,
    request: WorkerRequest,
    resolve: (response: WorkerResponse) => void,
    reject: (error: Error) => void
  ): Promise<void> {
    const { worker } = pooledWorker;
    pooledWorker.busy = true;
    pooledWorker.taskCount++;

    const requestId = ++this.requestCounter;
    const requestWithId = { ...request, requestId };

    this.log(`Executing ${request.type} on worker (queue: ${this.queue.length})`);

    let timeoutHandle: NodeJS.Timeout | null = null;
    let responseReceived = false;

    const handleMessage = (e: MessageEvent) => {
      const response = e.data as WorkerResponse;

      // Only handle responses for this request
      if (response.requestId !== requestId) {
        return;
      }

      responseReceived = true;

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);

      pooledWorker.busy = false;

      if ('ok' in response && !response.ok) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }

      // Process next queued task
      this.processQueue();
    };

    const handleError = (error: ErrorEvent) => {
      responseReceived = true;

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);

      pooledWorker.busy = false;

      reject(new Error(`Worker error: ${error.message}`));

      // Process next queued task
      this.processQueue();
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    // Set timeout
    timeoutHandle = setTimeout(() => {
      if (!responseReceived) {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);

        pooledWorker.busy = false;

        reject(new Error(`Worker timeout after ${this.workerTimeout}ms`));

        // Recreate the worker as it may be stuck
        this.replaceWorker(pooledWorker);

        // Process next queued task
        this.processQueue();
      }
    }, this.workerTimeout);

    // Send request
    worker.postMessage(requestWithId);
  }

  /**
   * Replace a problematic worker
   */
  private async replaceWorker(pooledWorker: PooledWorker): Promise<void> {
    this.log('Replacing problematic worker');

    const index = this.workers.indexOf(pooledWorker);
    if (index !== -1) {
      pooledWorker.worker.terminate();
      this.workers.splice(index, 1);

      // Create a new worker
      await this.createWorker();
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalWorkers: number;
    busyWorkers: number;
    queueLength: number;
    totalTasks: number;
  } {
    const busyWorkers = this.workers.filter((w) => w.busy).length;
    const totalTasks = this.workers.reduce((sum, w) => sum + w.taskCount, 0);

    return {
      totalWorkers: this.workers.length,
      busyWorkers,
      queueLength: this.queue.length,
      totalTasks,
    };
  }

  /**
   * Terminate all workers
   */
  terminate(): void {
    this.log('Terminating worker pool');

    for (const pooledWorker of this.workers) {
      pooledWorker.worker.terminate();
    }

    this.workers = [];
    this.queue = [];
  }
}

// Singleton instance
let poolInstance: WorkerPool | null = null;

export function getWorkerPool(): WorkerPool {
  if (!poolInstance) {
    poolInstance = new WorkerPool();
    poolInstance.initialize();
  }
  return poolInstance;
}
