/**
 * CAD Telemetry and Metrics
 *
 * Tracks performance metrics, errors, and usage patterns.
 */

export interface BuildMetrics {
  cadScript: string;
  paramCount: number;
  buildDuration: number;
  triCount: number;
  volume?: number;
  surfaceArea?: number;
  cacheHit: boolean;
  workerIndex?: number;
  timestamp: number;
}

export interface ErrorMetrics {
  errorType: 'build' | 'worker' | 'cache' | 'viewer' | 'generation';
  message: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: number;
}

export interface ViewerMetrics {
  fps: number;
  triCount: number;
  drawCalls: number;
  lodLevel: number;
  cameraDistance: number;
  timestamp: number;
}

export interface GenerativeMetrics {
  description: string;
  temperature: number;
  duration: number;
  tokenCount?: number;
  success: boolean;
  errorMessage?: string;
  timestamp: number;
}

export interface CacheMetrics {
  operation: 'hit' | 'miss' | 'set' | 'evict';
  entryCount: number;
  totalSizeMB: number;
  timestamp: number;
}

export interface TelemetrySnapshot {
  builds: BuildMetrics[];
  errors: ErrorMetrics[];
  viewer: ViewerMetrics[];
  generative: GenerativeMetrics[];
  cache: CacheMetrics[];
  sessionStart: number;
  sessionDuration: number;
}

export class CADTelemetry {
  private builds: BuildMetrics[] = [];
  private errors: ErrorMetrics[] = [];
  private viewer: ViewerMetrics[] = [];
  private generative: GenerativeMetrics[] = [];
  private cache: CacheMetrics[] = [];
  private sessionStart: number;
  private maxStoredMetrics: number = 1000;

  constructor() {
    this.sessionStart = Date.now();
    console.log('[Telemetry] Initialized');
  }

  /**
   * Record a build operation
   */
  recordBuild(metrics: Omit<BuildMetrics, 'timestamp'>): void {
    this.builds.push({
      ...metrics,
      timestamp: Date.now(),
    });

    this.trimMetrics(this.builds);

    console.log(
      `[Telemetry] Build: ${metrics.triCount} tris in ${metrics.buildDuration}ms (cache: ${metrics.cacheHit})`
    );
  }

  /**
   * Record an error
   */
  recordError(metrics: Omit<ErrorMetrics, 'timestamp'>): void {
    this.errors.push({
      ...metrics,
      timestamp: Date.now(),
    });

    this.trimMetrics(this.errors);

    console.error(`[Telemetry] Error [${metrics.errorType}]:`, metrics.message);
  }

  /**
   * Record viewer metrics
   */
  recordViewer(metrics: Omit<ViewerMetrics, 'timestamp'>): void {
    this.viewer.push({
      ...metrics,
      timestamp: Date.now(),
    });

    this.trimMetrics(this.viewer);
  }

  /**
   * Record generative operation
   */
  recordGenerative(metrics: Omit<GenerativeMetrics, 'timestamp'>): void {
    this.generative.push({
      ...metrics,
      timestamp: Date.now(),
    });

    this.trimMetrics(this.generative);

    console.log(
      `[Telemetry] Generation: ${metrics.success ? 'success' : 'failed'} in ${metrics.duration}ms`
    );
  }

  /**
   * Record cache operation
   */
  recordCache(metrics: Omit<CacheMetrics, 'timestamp'>): void {
    this.cache.push({
      ...metrics,
      timestamp: Date.now(),
    });

    this.trimMetrics(this.cache);
  }

  /**
   * Get all metrics
   */
  getSnapshot(): TelemetrySnapshot {
    return {
      builds: [...this.builds],
      errors: [...this.errors],
      viewer: [...this.viewer],
      generative: [...this.generative],
      cache: [...this.cache],
      sessionStart: this.sessionStart,
      sessionDuration: Date.now() - this.sessionStart,
    };
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalBuilds: number;
    totalErrors: number;
    averageBuildTime: number;
    cacheHitRate: number;
    averageFPS: number;
    totalGenerations: number;
    generationSuccessRate: number;
  } {
    const totalBuilds = this.builds.length;
    const totalErrors = this.errors.length;

    const averageBuildTime =
      totalBuilds > 0
        ? this.builds.reduce((sum, b) => sum + b.buildDuration, 0) / totalBuilds
        : 0;

    const cacheHits = this.builds.filter((b) => b.cacheHit).length;
    const cacheHitRate = totalBuilds > 0 ? cacheHits / totalBuilds : 0;

    const averageFPS =
      this.viewer.length > 0
        ? this.viewer.reduce((sum, v) => sum + v.fps, 0) / this.viewer.length
        : 0;

    const totalGenerations = this.generative.length;
    const successfulGenerations = this.generative.filter((g) => g.success).length;
    const generationSuccessRate =
      totalGenerations > 0 ? successfulGenerations / totalGenerations : 0;

    return {
      totalBuilds,
      totalErrors,
      averageBuildTime,
      cacheHitRate,
      averageFPS,
      totalGenerations,
      generationSuccessRate,
    };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count: number = 10): ErrorMetrics[] {
    return this.errors.slice(-count);
  }

  /**
   * Get build performance over time
   */
  getBuildPerformance(): Array<{ timestamp: number; duration: number; cached: boolean }> {
    return this.builds.map((b) => ({
      timestamp: b.timestamp,
      duration: b.buildDuration,
      cached: b.cacheHit,
    }));
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.builds = [];
    this.errors = [];
    this.viewer = [];
    this.generative = [];
    this.cache = [];
    this.sessionStart = Date.now();

    console.log('[Telemetry] Cleared all metrics');
  }

  /**
   * Export metrics to JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.getSnapshot(), null, 2);
  }

  /**
   * Trim metrics arrays to prevent memory bloat
   */
  private trimMetrics<T>(array: T[]): void {
    if (array.length > this.maxStoredMetrics) {
      array.splice(0, array.length - this.maxStoredMetrics);
    }
  }

  /**
   * Get metrics for a specific time range
   */
  getMetricsInRange(startTime: number, endTime: number): TelemetrySnapshot {
    return {
      builds: this.builds.filter((m) => m.timestamp >= startTime && m.timestamp <= endTime),
      errors: this.errors.filter((m) => m.timestamp >= startTime && m.timestamp <= endTime),
      viewer: this.viewer.filter((m) => m.timestamp >= startTime && m.timestamp <= endTime),
      generative: this.generative.filter(
        (m) => m.timestamp >= startTime && m.timestamp <= endTime
      ),
      cache: this.cache.filter((m) => m.timestamp >= startTime && m.timestamp <= endTime),
      sessionStart: this.sessionStart,
      sessionDuration: Date.now() - this.sessionStart,
    };
  }

  /**
   * Get error breakdown by type
   */
  getErrorBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {};

    for (const error of this.errors) {
      breakdown[error.errorType] = (breakdown[error.errorType] || 0) + 1;
    }

    return breakdown;
  }
}

// Singleton instance
let telemetryInstance: CADTelemetry | null = null;

export function getTelemetry(): CADTelemetry {
  if (!telemetryInstance) {
    telemetryInstance = new CADTelemetry();
  }
  return telemetryInstance;
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = performance.now();
  }

  end(): number {
    const duration = performance.now() - this.startTime;
    console.log(`[Perf] ${this.label}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  endWithCallback(callback: (duration: number) => void): void {
    const duration = this.end();
    callback(duration);
  }
}

/**
 * Create a performance monitor
 */
export function monitor(label: string): PerformanceMonitor {
  return new PerformanceMonitor(label);
}
