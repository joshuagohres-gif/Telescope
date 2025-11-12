/**
 * Template: Focuser Drawtube
 *
 * A telescope focuser drawtube with keyway slot for preventing rotation.
 * Compatible with standard 2" and 1.25" eyepiece formats.
 */

import type { ParamSchema } from '../types/param-schema';

export const templateName = 'Focuser Drawtube';
export const templateDescription = 'Telescope focuser drawtube with keyway slot and optional compression ring groove';
export const templateTags = ['focuser', 'drawtube', 'eyepiece'];

export const paramSchema: ParamSchema = {
  version: '1.0',
  name: 'Focuser Drawtube',
  description: 'Adjustable drawtube for telescope focusers',
  author: 'Telescope CAD Templates',
  tags: ['focuser', 'drawtube', 'eyepiece'],
  params: {
    // Format selection
    format: {
      type: 'enum',
      label: 'Eyepiece Format',
      description: 'Standard eyepiece barrel size',
      default: '2inch',
      options: [
        { value: '2inch', label: '2" (50.8mm)' },
        { value: '1.25inch', label: '1.25" (31.75mm)' },
      ],
      group: 'Format',
    },

    // Dimensions
    innerDiameter: {
      type: 'number',
      label: 'Inner Diameter',
      description: 'Inner bore diameter (auto-set by format)',
      default: 50.8,
      min: 25,
      max: 100,
      units: 'mm',
      group: 'Dimensions',
    },
    outerDiameter: {
      type: 'number',
      label: 'Outer Diameter',
      description: 'Outer diameter of the drawtube',
      default: 60,
      min: 35,
      max: 120,
      units: 'mm',
      group: 'Dimensions',
    },
    length: {
      type: 'number',
      label: 'Length',
      description: 'Total length of the drawtube',
      default: 100,
      min: 50,
      max: 200,
      units: 'mm',
      group: 'Dimensions',
    },

    // Keyway
    includeKeyway: {
      type: 'boolean',
      label: 'Include Keyway',
      description: 'Add keyway slot to prevent rotation',
      default: true,
      group: 'Features',
    },
    keywayWidth: {
      type: 'number',
      label: 'Keyway Width',
      description: 'Width of the keyway slot',
      default: 4,
      min: 2,
      max: 10,
      units: 'mm',
      group: 'Features',
    },
    keywayDepth: {
      type: 'number',
      label: 'Keyway Depth',
      description: 'Depth of the keyway slot',
      default: 3,
      min: 1,
      max: 8,
      units: 'mm',
      group: 'Features',
    },

    // Compression ring
    includeCompressionRing: {
      type: 'boolean',
      label: 'Include Compression Ring Groove',
      description: 'Add groove for compression ring',
      default: true,
      group: 'Features',
    },
    ringGrooveWidth: {
      type: 'number',
      label: 'Ring Groove Width',
      description: 'Width of the compression ring groove',
      default: 8,
      min: 5,
      max: 15,
      units: 'mm',
      group: 'Features',
    },
    ringGrooveDepth: {
      type: 'number',
      label: 'Ring Groove Depth',
      description: 'Depth of the compression ring groove',
      default: 2,
      min: 0.5,
      max: 5,
      units: 'mm',
      group: 'Features',
    },
    ringGroovePosition: {
      type: 'number',
      label: 'Ring Groove Position',
      description: 'Distance from front end to ring groove center',
      default: 25,
      min: 10,
      max: 80,
      units: 'mm',
      group: 'Features',
    },

    // Mounting flange
    includeFlange: {
      type: 'boolean',
      label: 'Include Mounting Flange',
      description: 'Add flange at rear for mounting',
      default: true,
      group: 'Mounting',
    },
    flangeThickness: {
      type: 'number',
      label: 'Flange Thickness',
      description: 'Thickness of the mounting flange',
      default: 5,
      min: 2,
      max: 15,
      units: 'mm',
      group: 'Mounting',
    },
  },
  constraints: [
    {
      expression: 'innerDiameter < outerDiameter - 4',
      message: 'Wall thickness must be at least 2mm',
    },
    {
      expression: 'keywayDepth < (outerDiameter - innerDiameter) / 2 - 1',
      message: 'Keyway too deep for wall thickness',
    },
    {
      expression: 'ringGrooveDepth < (outerDiameter - innerDiameter) / 2 - 1',
      message: 'Ring groove too deep for wall thickness',
    },
    {
      expression: 'ringGroovePosition < length - ringGrooveWidth',
      message: 'Ring groove position too close to end',
    },
  ],
};

export const cadScript = `
function build(ctx, params) {
  const { primitives, ops, bool, feature } = ctx;

  ctx.log('Creating focuser drawtube...');

  // Set inner diameter based on format
  let innerDiam = params.innerDiameter;
  if (params.format === '2inch') {
    innerDiam = 50.8;
  } else if (params.format === '1.25inch') {
    innerDiam = 31.75;
  }

  const innerRadius = innerDiam / 2;
  const outerRadius = params.outerDiameter / 2;
  const length = params.length;

  ctx.log(\`Format: \${params.format}, ID=\${innerDiam.toFixed(2)}mm, OD=\${params.outerDiameter}mm\`);

  // Create main tube
  const outer = primitives.cylinder(outerRadius, length, true);
  const inner = primitives.cylinder(innerRadius, length * 1.1, true);
  let drawtube = bool.subtract(outer, inner);

  feature('main_tube', drawtube);

  // Add keyway slot
  if (params.includeKeyway) {
    const keywayBox = primitives.box(
      params.keywayWidth,
      params.keywayDepth * 2,
      length,
      true
    );

    const keywayPosition = ops.translate(keywayBox, {
      x: 0,
      y: outerRadius - params.keywayDepth / 2,
      z: 0
    });

    drawtube = bool.subtract(drawtube, keywayPosition);
    feature('keyway', keywayPosition);

    ctx.log(\`Keyway: \${params.keywayWidth}mm x \${params.keywayDepth}mm deep\`);
  }

  // Add compression ring groove
  if (params.includeCompressionRing) {
    const grooveRadius = outerRadius - params.ringGrooveDepth;
    const grooveCylinder = primitives.cylinder(grooveRadius, params.ringGrooveWidth, true);

    const groovePosition = ops.translate(grooveCylinder, {
      x: 0,
      y: 0,
      z: length / 2 - params.ringGroovePosition
    });

    drawtube = bool.subtract(drawtube, groovePosition);
    feature('compression_groove', groovePosition);

    ctx.log(\`Compression ring groove at \${params.ringGroovePosition}mm from front\`);
  }

  // Add mounting flange at rear
  if (params.includeFlange) {
    const flangeRadius = outerRadius + 10;
    const flangeThickness = params.flangeThickness;

    const flange = primitives.cylinder(flangeRadius, flangeThickness, true);
    const flangePosition = ops.translate(flange, {
      x: 0,
      y: 0,
      z: -(length / 2 + flangeThickness / 2)
    });

    drawtube = bool.union(drawtube, flangePosition);
    feature('mounting_flange', flangePosition);

    ctx.log(\`Mounting flange: \${flangeRadius * 2}mm diameter x \${flangeThickness}mm thick\`);
  }

  const volume = ctx.query.volume(drawtube);
  ctx.log(\`Drawtube complete: volume=\${volume.toFixed(2)} mm³\`);

  return drawtube;
}
`;

export const suggestedParams = {
  format: '2inch',
  innerDiameter: 50.8,
  outerDiameter: 60,
  length: 100,
  includeKeyway: true,
  keywayWidth: 4,
  keywayDepth: 3,
  includeCompressionRing: true,
  ringGrooveWidth: 8,
  ringGrooveDepth: 2,
  ringGroovePosition: 25,
  includeFlange: true,
  flangeThickness: 5,
};
