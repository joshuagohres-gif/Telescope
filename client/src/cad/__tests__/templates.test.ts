/**
 * Tests for Template System
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_TEMPLATES,
  getTemplate,
  findTemplatesByTag,
  searchTemplates,
  getAllTags,
} from '../templates';

describe('Template System', () => {
  it('has exactly 5 templates', () => {
    expect(ALL_TEMPLATES).toHaveLength(5);
  });

  it('all templates have required fields', () => {
    ALL_TEMPLATES.forEach((template) => {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.tags).toBeDefined();
      expect(template.paramSchema).toBeDefined();
      expect(template.cadScript).toBeDefined();
      expect(template.suggestedParams).toBeDefined();
    });
  });

  it('gets template by ID', () => {
    const template = getTemplate('tube-clamp');
    expect(template).toBeDefined();
    expect(template?.name).toBe('Tube Clamp Ring');
  });

  it('returns undefined for invalid ID', () => {
    const template = getTemplate('non-existent');
    expect(template).toBeUndefined();
  });

  it('finds templates by tag', () => {
    const mountingTemplates = findTemplatesByTag('mounting');
    expect(mountingTemplates.length).toBeGreaterThan(0);

    mountingTemplates.forEach((t) => {
      expect(t.tags).toContain('mounting');
    });
  });

  it('searches templates by name', () => {
    const results = searchTemplates('clamp');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toContain('Clamp');
  });

  it('searches templates by description', () => {
    const results = searchTemplates('finder');
    expect(results.length).toBeGreaterThan(0);
  });

  it('searches templates by tag', () => {
    const results = searchTemplates('spider');
    expect(results.length).toBeGreaterThan(0);
  });

  it('gets all unique tags', () => {
    const tags = getAllTags();
    expect(tags.length).toBeGreaterThan(0);
    expect(new Set(tags).size).toBe(tags.length); // All unique
  });

  it('all templates have valid param schemas', () => {
    ALL_TEMPLATES.forEach((template) => {
      const schema = template.paramSchema;

      expect(schema.version).toBeDefined();
      expect(schema.name).toBeDefined();
      expect(schema.params).toBeDefined();
      expect(typeof schema.params).toBe('object');

      // Check params structure
      Object.values(schema.params).forEach((param: any) => {
        expect(param.type).toBeDefined();
        expect(param.label).toBeDefined();
        expect(param.default).toBeDefined();
      });
    });
  });

  it('all templates have valid CAD scripts', () => {
    ALL_TEMPLATES.forEach((template) => {
      expect(template.cadScript).toBeDefined();
      expect(typeof template.cadScript).toBe('string');
      expect(template.cadScript.length).toBeGreaterThan(0);

      // Should contain function definition
      expect(template.cadScript).toContain('function build');
      expect(template.cadScript).toContain('ctx');
      expect(template.cadScript).toContain('params');
    });
  });

  it('suggested params match param schema', () => {
    ALL_TEMPLATES.forEach((template) => {
      const suggestedKeys = Object.keys(template.suggestedParams);
      const schemaKeys = Object.keys(template.paramSchema.params);

      // Suggested params should be subset of schema params
      suggestedKeys.forEach((key) => {
        expect(schemaKeys).toContain(key);
      });
    });
  });

  describe('Specific Templates', () => {
    it('tube-clamp template has correct structure', () => {
      const template = getTemplate('tube-clamp');
      expect(template).toBeDefined();
      expect(template?.paramSchema.params.tubeDiameter).toBeDefined();
      expect(template?.paramSchema.params.clampThickness).toBeDefined();
      expect(template?.paramSchema.params.boltHoles).toBeDefined();
    });

    it('focuser-drawtube template has eyepiece format options', () => {
      const template = getTemplate('focuser-drawtube');
      expect(template).toBeDefined();
      expect(template?.paramSchema.params.format).toBeDefined();
      expect(template?.paramSchema.params.format.type).toBe('enum');
    });

    it('dovetail-bar template has style options', () => {
      const template = getTemplate('dovetail-bar');
      expect(template).toBeDefined();
      expect(template?.paramSchema.params.style).toBeDefined();
      expect(template?.paramSchema.params.style.type).toBe('enum');
      expect(template?.paramSchema.params.style.options).toHaveLength(2);
    });

    it('spider-vane template has vane count options', () => {
      const template = getTemplate('spider-vane');
      expect(template).toBeDefined();
      expect(template?.paramSchema.params.vaneCount).toBeDefined();
      expect(template?.paramSchema.params.vaneCount.type).toBe('enum');
    });

    it('finder-rings template has proper constraints', () => {
      const template = getTemplate('finder-rings');
      expect(template).toBeDefined();
      expect(template?.paramSchema.constraints).toBeDefined();
      expect(template?.paramSchema.constraints?.length).toBeGreaterThan(0);
    });
  });
});
