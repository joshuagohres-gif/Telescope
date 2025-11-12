/**
 * LLM Bridge for Generative CAD
 *
 * Converts natural language descriptions into parametric CAD models
 * using OpenAI API.
 */

import type { ParamSchema } from '../types/param-schema';
import { validateParams } from '../types/param-schema';

// ===== TYPES =====

export interface GenerativeRequest {
  description: string;
  constraints?: {
    maxDimension?: number;    // Maximum dimension in mm
    material?: string;         // Material type (affects design decisions)
    printable?: boolean;       // 3D printable constraints (no overhangs)
    minWallThickness?: number; // Minimum wall thickness in mm
  };
  context?: {
    existingParts?: string[];  // Related parts for compatibility
    mountingStandard?: string; // e.g., "M42 thread", "dovetail"
  };
}

export interface GenerativeResponse {
  cadScript: string;
  paramSchema: ParamSchema;
  suggestedParams: Record<string, any>;
  explanation: string;
  warnings?: string[];
}

export interface RefineRequest {
  existingScript: string;
  existingSchema: ParamSchema;
  refinement: string;
}

// ===== SYSTEM PROMPT =====

const SYSTEM_PROMPT = `You are an expert CAD engineer specializing in telescope and optical instrument design. You write CADScript for the OpenCascade.js engine.

# CADScript Format

CADScript is JavaScript executed in a sandboxed Worker. It receives:
- ctx: BuildContext with CAD APIs
- params: User-defined parameters

# Available APIs

## ctx.primitives
- box(width, depth, height, center?): Create rectangular box
- sphere(radius, center?): Create sphere
- cylinder(radius, height, center?): Create cylinder
- cone(radius1, radius2, height): Create cone
- torus(majorRadius, minorRadius): Create torus
- sketch(): Create 2D sketch (moveTo, lineTo, arcTo, circle, rectangle, polygon)
- point(x, y, z): Create point
- vector(x, y, z): Create vector
- plane(origin, normal): Create plane

## ctx.ops
- extrude(profile, distance, direction?): Extrude 2D profile
- revolve(profile, axis, angle): Revolve profile around axis
- loft(profiles, ruled?): Loft between profiles
- sweep(profile, path): Sweep profile along path
- fillet(shape, edges, radius): Round edges
- chamfer(shape, edges, distance): Chamfer edges
- shell(shape, faces, thickness, inside?): Shell out shape
- offset(shape, distance): Offset shape
- transform(shape, transform): Apply transformation
- translate(shape, vector): Move shape
- rotate(shape, axis, angle): Rotate shape
- scale(shape, factor): Scale shape
- mirror(shape, plane): Mirror shape
- linearArray(shape, direction, count, spacing): Linear pattern
- circularArray(shape, axis, count): Circular pattern

## ctx.bool
- union(...shapes): Combine shapes
- subtract(base, ...tools): Remove tools from base
- intersect(...shapes): Intersection of shapes
- cut(base, tool): Boolean cut

## ctx.query
- volume(shape): Get volume (mm³)
- surfaceArea(shape): Get surface area (mm²)
- boundingBox(shape): Get bounding box
- centerOfMass(shape): Get center of mass
- faces(shape): Get all faces
- edges(shape): Get all edges
- vertices(shape): Get all vertices
- facesByNormal(shape, normal, tolerance?): Find faces by normal
- edgesByLength(shape, minLength, maxLength?): Find edges by length

## ctx.feature
- feature(name, shape): Tag shape for UI highlighting
- feature.all(): Get all tagged features
- feature.clear(): Clear all tags

## Constants
- ctx.PI, ctx.DEG_TO_RAD, ctx.RAD_TO_DEG

## Utilities
- ctx.log(message), ctx.warn(message), ctx.error(message)

# Example CADScript

\`\`\`javascript
function build(ctx, params) {
  const { primitives, ops, bool, feature } = ctx;

  // Create base cylinder
  const base = primitives.cylinder(params.diameter / 2, params.height);

  // Create mounting holes
  const hole = primitives.cylinder(params.holeDiameter / 2, params.height * 1.1);
  const holeTranslated = ops.translate(hole, {
    x: params.boltCircleDiameter / 2,
    y: 0,
    z: 0
  });
  const holeArray = ops.circularArray(
    holeTranslated,
    { x: 0, y: 0, z: 1 },
    params.holeCount
  );

  // Boolean operations
  const result = bool.subtract(base, holeArray);

  // Tag features
  feature('body', base);
  feature('holes', holeArray);

  ctx.log(\`Created part with \${params.holeCount} holes\`);

  return result;
}
\`\`\`

# ParamSchema Format

Define user-adjustable parameters:

\`\`\`typescript
{
  version: "1.0",
  name: "Part Name",
  description: "Description",
  params: {
    diameter: {
      type: 'number',
      label: 'Diameter',
      default: 100,
      min: 50,
      max: 500,
      units: 'mm',
      group: 'Dimensions'
    },
    holeCount: {
      type: 'integer',
      label: 'Number of Holes',
      default: 4,
      min: 3,
      max: 12,
      group: 'Features'
    },
    material: {
      type: 'enum',
      label: 'Material',
      default: 'aluminum',
      options: [
        { value: 'aluminum', label: 'Aluminum' },
        { value: 'steel', label: 'Steel' },
        { value: 'plastic', label: 'Plastic' }
      ]
    },
    includeMountingHoles: {
      type: 'boolean',
      label: 'Include Mounting Holes',
      default: true
    }
  },
  constraints: [
    {
      expression: 'holeDiameter < diameter / 4',
      message: 'Hole diameter must be less than 1/4 of part diameter'
    }
  ]
}
\`\`\`

# Design Principles

1. **Units**: Always use millimeters (mm)
2. **Printability**: If printable=true, avoid overhangs >45°, ensure min wall thickness
3. **Parametric**: Make dimensions adjustable, use constraints
4. **Feature tagging**: Tag important parts for UI highlighting
5. **Validation**: Check for valid geometry (no self-intersections)
6. **Logging**: Use ctx.log() for build progress
7. **Standards**: Follow telescope industry standards (e.g., SCT threads, dovetails)

# Your Task

Generate valid CADScript and ParamSchema from user descriptions.
Output JSON format:
\`\`\`json
{
  "cadScript": "function build(ctx, params) { ... }",
  "paramSchema": { ... },
  "suggestedParams": { ... },
  "explanation": "This design creates...",
  "warnings": ["Optional warnings"]
}
\`\`\`

Be precise, practical, and follow telescope industry conventions.`;

// ===== LLM BRIDGE CLASS =====

export class GenerativeBridge {
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1';
  private model = 'gpt-4-turbo-preview';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generate CAD model from natural language description
   */
  async generateFromDescription(req: GenerativeRequest): Promise<GenerativeResponse> {
    const userPrompt = this.buildUserPrompt(req);

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result: GenerativeResponse = JSON.parse(content);

    // Validate the generated ParamSchema
    this.validateGeneratedCode(result);

    return result;
  }

  /**
   * Refine existing model with additional instructions
   */
  async refineModel(req: RefineRequest): Promise<GenerativeResponse> {
    const userPrompt = `
I have an existing CAD model:

**Current CADScript:**
\`\`\`javascript
${req.existingScript}
\`\`\`

**Current ParamSchema:**
\`\`\`json
${JSON.stringify(req.existingSchema, null, 2)}
\`\`\`

**Refinement Request:**
${req.refinement}

Please modify the CADScript and ParamSchema to incorporate this refinement.
Maintain backward compatibility with existing parameters where possible.
`;

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result: GenerativeResponse = JSON.parse(content);

    this.validateGeneratedCode(result);

    return result;
  }

  /**
   * Suggest parameter schema for existing CADScript
   */
  async suggestParameters(cadScript: string): Promise<ParamSchema> {
    const userPrompt = `
Analyze this CADScript and generate a comprehensive ParamSchema:

\`\`\`javascript
${cadScript}
\`\`\`

Generate a ParamSchema that exposes all useful parameters with:
- Appropriate types, labels, and descriptions
- Sensible defaults and ranges
- Logical grouping
- Validation constraints
`;

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content);
    return result.paramSchema;
  }

  // ===== PRIVATE METHODS =====

  private buildUserPrompt(req: GenerativeRequest): string {
    let prompt = `Design a CAD model: ${req.description}\n\n`;

    if (req.constraints) {
      prompt += '**Constraints:**\n';
      if (req.constraints.maxDimension) {
        prompt += `- Maximum dimension: ${req.constraints.maxDimension} mm\n`;
      }
      if (req.constraints.material) {
        prompt += `- Material: ${req.constraints.material}\n`;
      }
      if (req.constraints.printable) {
        prompt += `- Must be 3D printable (no overhangs >45°, min wall thickness: ${req.constraints.minWallThickness || 2}mm)\n`;
      }
    }

    if (req.context) {
      prompt += '\n**Context:**\n';
      if (req.context.existingParts) {
        prompt += `- Related parts: ${req.context.existingParts.join(', ')}\n`;
      }
      if (req.context.mountingStandard) {
        prompt += `- Mounting standard: ${req.context.mountingStandard}\n`;
      }
    }

    prompt += '\nGenerate complete CADScript and ParamSchema in JSON format.';

    return prompt;
  }

  private validateGeneratedCode(result: GenerativeResponse): void {
    // Validate CADScript syntax
    if (!result.cadScript.includes('function build')) {
      throw new Error('Generated CADScript missing build function');
    }

    // Validate ParamSchema
    if (!result.paramSchema || !result.paramSchema.params) {
      throw new Error('Generated ParamSchema is invalid');
    }

    // Validate suggestedParams match schema
    const validation = validateParams(result.paramSchema, result.suggestedParams);
    if (!validation.valid) {
      throw new Error(`Suggested parameters are invalid: ${validation.errors.map(e => e.message).join(', ')}`);
    }
  }
}

// ===== FACTORY =====

let globalBridge: GenerativeBridge | null = null;

export function getGenerativeBridge(apiKey?: string): GenerativeBridge {
  if (!globalBridge) {
    const key = apiKey || process.env.OPENAI_API_KEY || '';
    if (!key) {
      throw new Error('OpenAI API key not provided');
    }
    globalBridge = new GenerativeBridge(key);
  }
  return globalBridge;
}
