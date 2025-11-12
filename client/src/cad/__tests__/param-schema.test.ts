/**
 * Tests for ParamSchema validation
 */

import { describe, it, expect } from 'vitest';
import { validateParams, type ParamSchema } from '../types/param-schema';

describe('ParamSchema Validation', () => {
  const testSchema: ParamSchema = {
    version: '1.0',
    name: 'Test Schema',
    description: 'Test parameter schema',
    params: {
      diameter: {
        type: 'number',
        label: 'Diameter',
        default: 50,
        min: 10,
        max: 100,
        units: 'mm',
      },
      height: {
        type: 'number',
        label: 'Height',
        default: 100,
        min: 20,
        max: 200,
        units: 'mm',
      },
      name: {
        type: 'string',
        label: 'Name',
        default: 'Part',
        pattern: '^[a-zA-Z0-9_-]+$',
      },
      enabled: {
        type: 'boolean',
        label: 'Enabled',
        default: true,
      },
      quality: {
        type: 'enum',
        label: 'Quality',
        default: 'medium',
        options: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ],
      },
    },
    constraints: [
      {
        expression: 'height > diameter',
        message: 'Height must be greater than diameter',
      },
    ],
  };

  it('validates valid parameters', () => {
    const params = {
      diameter: 50,
      height: 100,
      name: 'test-part',
      enabled: true,
      quality: 'medium',
    };

    const result = validateParams(testSchema, params);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.constraintViolations).toHaveLength(0);
  });

  it('detects missing required parameters', () => {
    const params = {
      diameter: 50,
      // height is missing
    };

    const result = validateParams(testSchema, params);
    expect(result.valid).toBe(false);
    expect(result.errors.height).toBeDefined();
  });

  it('validates number ranges', () => {
    const params = {
      diameter: 150, // exceeds max of 100
      height: 100,
      name: 'test',
      enabled: true,
      quality: 'medium',
    };

    const result = validateParams(testSchema, params);
    expect(result.valid).toBe(false);
    expect(result.errors.diameter).toContain('maximum');
  });

  it('validates string patterns', () => {
    const params = {
      diameter: 50,
      height: 100,
      name: 'test with spaces', // violates pattern
      enabled: true,
      quality: 'medium',
    };

    const result = validateParams(testSchema, params);
    expect(result.valid).toBe(false);
    expect(result.errors.name).toContain('pattern');
  });

  it('validates enum values', () => {
    const params = {
      diameter: 50,
      height: 100,
      name: 'test',
      enabled: true,
      quality: 'invalid', // not in options
    };

    const result = validateParams(testSchema, params);
    expect(result.valid).toBe(false);
    expect(result.errors.quality).toBeDefined();
  });

  it('evaluates constraints', () => {
    const params = {
      diameter: 100,
      height: 50, // violates constraint: height > diameter
      name: 'test',
      enabled: true,
      quality: 'medium',
    };

    const result = validateParams(testSchema, params);
    expect(result.valid).toBe(false);
    expect(result.constraintViolations).toContain('Height must be greater than diameter');
  });

  it('uses default values for missing optional params', () => {
    const params = {
      diameter: 50,
      height: 100,
      // name, enabled, quality should use defaults
    };

    const result = validateParams(testSchema, params);
    expect(result.valid).toBe(true);
  });
});
