/**
 * Template Registry
 *
 * Central registry of all CAD templates available in the system.
 */

import * as tubeClamp from './tube-clamp';
import * as focuserDrawtube from './focuser-drawtube';
import * as dovetailBar from './dovetail-bar';
import * as spiderVane from './spider-vane';
import * as finderRings from './finder-rings';
import type { ParamSchema } from '../types/param-schema';

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  tags: string[];
  paramSchema: ParamSchema;
  cadScript: string;
  suggestedParams: Record<string, any>;
  thumbnailUrl?: string;
}

export const TEMPLATES: Record<string, TemplateInfo> = {
  'tube-clamp': {
    id: 'tube-clamp',
    name: tubeClamp.templateName,
    description: tubeClamp.templateDescription,
    tags: tubeClamp.templateTags,
    paramSchema: tubeClamp.paramSchema,
    cadScript: tubeClamp.cadScript,
    suggestedParams: tubeClamp.suggestedParams,
  },
  'focuser-drawtube': {
    id: 'focuser-drawtube',
    name: focuserDrawtube.templateName,
    description: focuserDrawtube.templateDescription,
    tags: focuserDrawtube.templateTags,
    paramSchema: focuserDrawtube.paramSchema,
    cadScript: focuserDrawtube.cadScript,
    suggestedParams: focuserDrawtube.suggestedParams,
  },
  'dovetail-bar': {
    id: 'dovetail-bar',
    name: dovetailBar.templateName,
    description: dovetailBar.templateDescription,
    tags: dovetailBar.templateTags,
    paramSchema: dovetailBar.paramSchema,
    cadScript: dovetailBar.cadScript,
    suggestedParams: dovetailBar.suggestedParams,
  },
  'spider-vane': {
    id: 'spider-vane',
    name: spiderVane.templateName,
    description: spiderVane.templateDescription,
    tags: spiderVane.templateTags,
    paramSchema: spiderVane.paramSchema,
    cadScript: spiderVane.cadScript,
    suggestedParams: spiderVane.suggestedParams,
  },
  'finder-rings': {
    id: 'finder-rings',
    name: finderRings.templateName,
    description: finderRings.templateDescription,
    tags: finderRings.templateTags,
    paramSchema: finderRings.paramSchema,
    cadScript: finderRings.cadScript,
    suggestedParams: finderRings.suggestedParams,
  },
};

export const ALL_TEMPLATES = Object.values(TEMPLATES);

/**
 * Get a template by ID
 */
export function getTemplate(id: string): TemplateInfo | undefined {
  return TEMPLATES[id];
}

/**
 * Find templates by tag
 */
export function findTemplatesByTag(tag: string): TemplateInfo[] {
  return ALL_TEMPLATES.filter((t) => t.tags.includes(tag));
}

/**
 * Search templates by keyword (name, description, or tags)
 */
export function searchTemplates(query: string): TemplateInfo[] {
  const lowerQuery = query.toLowerCase();
  return ALL_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get all unique tags across all templates
 */
export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  ALL_TEMPLATES.forEach((t) => t.tags.forEach((tag) => tagSet.add(tag)));
  return Array.from(tagSet).sort();
}

// Re-export template modules
export {
  tubeClamp,
  focuserDrawtube,
  dovetailBar,
  spiderVane,
  finderRings,
};
