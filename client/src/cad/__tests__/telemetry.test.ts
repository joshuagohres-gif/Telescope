/**
 * Tests for Telemetry System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CADTelemetry } from '../telemetry/metrics';

describe('CADTelemetry', () => {
  let telemetry: CADTelemetry;

  beforeEach(() => {
    telemetry = new CADTelemetry();
  });

  it('records build metrics', () => {
    telemetry.recordBuild({
      cadScript: 'test script',
      paramCount: 5,
      buildDuration: 100,
      triCount: 1000,
      volume: 50.5,
      cacheHit: false,
    });

    const summary = telemetry.getSummary();
    expect(summary.totalBuilds).toBe(1);
    expect(summary.averageBuildTime).toBe(100);
  });

  it('calculates cache hit rate', () => {
    telemetry.recordBuild({
      cadScript: 'test1',
      paramCount: 5,
      buildDuration: 100,
      triCount: 1000,
      cacheHit: false,
    });

    telemetry.recordBuild({
      cadScript: 'test2',
      paramCount: 5,
      buildDuration: 10,
      triCount: 1000,
      cacheHit: true,
    });

    telemetry.recordBuild({
      cadScript: 'test3',
      paramCount: 5,
      buildDuration: 10,
      triCount: 1000,
      cacheHit: true,
    });

    const summary = telemetry.getSummary();
    expect(summary.totalBuilds).toBe(3);
    expect(summary.cacheHitRate).toBeCloseTo(0.667, 2);
  });

  it('records errors', () => {
    telemetry.recordError({
      errorType: 'build',
      message: 'Test error',
    });

    const summary = telemetry.getSummary();
    expect(summary.totalErrors).toBe(1);

    const errors = telemetry.getRecentErrors(10);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Test error');
  });

  it('tracks generative metrics', () => {
    telemetry.recordGenerative({
      description: 'Test generation',
      temperature: 0.7,
      duration: 5000,
      success: true,
    });

    telemetry.recordGenerative({
      description: 'Failed generation',
      temperature: 0.7,
      duration: 3000,
      success: false,
      errorMessage: 'API error',
    });

    const summary = telemetry.getSummary();
    expect(summary.totalGenerations).toBe(2);
    expect(summary.generationSuccessRate).toBe(0.5);
  });

  it('exports JSON snapshot', () => {
    telemetry.recordBuild({
      cadScript: 'test',
      paramCount: 5,
      buildDuration: 100,
      triCount: 1000,
      cacheHit: false,
    });

    const json = telemetry.exportJSON();
    expect(json).toBeDefined();

    const snapshot = JSON.parse(json);
    expect(snapshot.builds).toHaveLength(1);
    expect(snapshot.sessionStart).toBeDefined();
  });

  it('clears all metrics', () => {
    telemetry.recordBuild({
      cadScript: 'test',
      paramCount: 5,
      buildDuration: 100,
      triCount: 1000,
      cacheHit: false,
    });

    telemetry.recordError({
      errorType: 'build',
      message: 'Test error',
    });

    telemetry.clear();

    const summary = telemetry.getSummary();
    expect(summary.totalBuilds).toBe(0);
    expect(summary.totalErrors).toBe(0);
  });

  it('gets error breakdown by type', () => {
    telemetry.recordError({ errorType: 'build', message: 'Build error 1' });
    telemetry.recordError({ errorType: 'build', message: 'Build error 2' });
    telemetry.recordError({ errorType: 'worker', message: 'Worker error' });
    telemetry.recordError({ errorType: 'cache', message: 'Cache error' });

    const breakdown = telemetry.getErrorBreakdown();
    expect(breakdown.build).toBe(2);
    expect(breakdown.worker).toBe(1);
    expect(breakdown.cache).toBe(1);
  });

  it('filters metrics by time range', () => {
    const startTime = Date.now();

    telemetry.recordBuild({
      cadScript: 'test1',
      paramCount: 5,
      buildDuration: 100,
      triCount: 1000,
      cacheHit: false,
    });

    // Wait a bit
    const midTime = Date.now() + 100;

    telemetry.recordBuild({
      cadScript: 'test2',
      paramCount: 5,
      buildDuration: 100,
      triCount: 1000,
      cacheHit: false,
    });

    const endTime = Date.now() + 200;

    const rangeMetrics = telemetry.getMetricsInRange(midTime, endTime);
    expect(rangeMetrics.builds.length).toBeGreaterThanOrEqual(1);
  });
});
