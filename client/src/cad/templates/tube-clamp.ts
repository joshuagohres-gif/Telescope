/**
 * Template: Telescope Tube Clamp
 *
 * A parametric clamping ring for securing optical tube assemblies.
 * Features: split ring design, mounting holes, adjustment mechanism.
 */

import type { ParamSchema } from '../types/param-schema';

export const templateName = 'Tube Clamp Ring';
export const templateDescription = 'Parametric tube clamp ring for securing optical tube assemblies with adjustable split gap and mounting holes';
export const templateTags = ['clamp', 'mounting', 'tube', 'optical'];

export const paramSchema: ParamSchema = {
  version: '1.0',
  name: 'Telescope Tube Clamp',
  description: 'Adjustable clamp ring for securing telescope tubes',
  author: 'Telescope CAD Templates',
  tags: ['clamp', 'tube', 'mounting'],
  params: {
    // Main dimensions
    tubeDiameter: {
      type: 'number',
      label: 'Tube Inner Diameter',
      description: 'Inner diameter of the tube to clamp',
      default: 200,
      min: 50,
      max: 500,
      units: 'mm',
      group: 'Dimensions',
    },
    clampThickness: {
      type: 'number',
      label: 'Clamp Wall Thickness',
      description: 'Thickness of the clamp ring wall',
      default: 5,
      min: 2,
      max: 15,
      units: 'mm',
      group: 'Dimensions',
    },
    clampHeight: {
      type: 'number',
      label: 'Clamp Height',
      description: 'Axial height of the clamp ring',
      default: 30,
      min: 10,
      max: 100,
      units: 'mm',
      group: 'Dimensions',
    },

    // Split gap
    splitGap: {
      type: 'number',
      label: 'Split Gap Width',
      description: 'Width of the split opening for clamping action',
      default: 5,
      min: 2,
      max: 20,
      units: 'mm',
      group: 'Split',
    },
    splitDepth: {
      type: 'number',
      label: 'Split Depth',
      description: 'How deep the split goes (percentage of ring)',
      default: 80,
      min: 50,
      max: 100,
      units: '%',
      group: 'Split',
    },

    // Mounting holes
    boltHoles: {
      type: 'integer',
      label: 'Number of Bolt Holes',
      description: 'Mounting bolt holes around the circumference',
      default: 4,
      min: 2,
      max: 12,
      group: 'Fasteners',
    },
    boltDiameter: {
      type: 'number',
      label: 'Bolt Hole Diameter',
      description: 'Diameter of mounting bolt holes (M6 = 6.5mm)',
      default: 6.5,
      min: 3,
      max: 12,
      units: 'mm',
      group: 'Fasteners',
    },
    boltCircleOffset: {
      type: 'number',
      label: 'Bolt Circle Offset',
      description: 'Distance from outer edge to bolt circle center',
      default: 10,
      min: 5,
      max: 30,
      units: 'mm',
      group: 'Fasteners',
    },

    // Clamping screws
    includeCam: {
      type: 'boolean',
      label: 'Include Clamping Screws',
      description: 'Add threaded holes for clamping screws across split',
      default: true,
      group: 'Features',
    },
    clampScrewSize: {
      type: 'number',
      label: 'Clamp Screw Diameter',
      description: 'Diameter for clamping screw holes (M6 = 6mm)',
      default: 6,
      min: 3,
      max: 10,
      units: 'mm',
      group: 'Features',
    },
  },
  constraints: [
    {
      expression: 'clampThickness < tubeDiameter / 4',
      message: 'Clamp thickness must be less than 1/4 of tube diameter',
    },
    {
      expression: 'boltDiameter < clampThickness * 2',
      message: 'Bolt diameter must be less than 2x clamp thickness',
    },
    {
      expression: 'splitGap < tubeDiameter / 10',
      message: 'Split gap should be less than 1/10 of tube diameter',
    },
    {
      expression: 'boltCircleOffset < clampThickness + 20',
      message: 'Bolt circle offset too large for clamp thickness',
    },
  ],
};

export const cadScript = `
function build(ctx, params) {
  const { primitives, ops, bool, feature } = ctx;

  const innerRadius = params.tubeDiameter / 2;
  const outerRadius = innerRadius + params.clampThickness;
  const height = params.clampHeight;

  ctx.log('Creating tube clamp ring...');

  // Create base ring
  const outerCylinder = primitives.cylinder(outerRadius, height, true);
  const innerCylinder = primitives.cylinder(innerRadius, height, true);
  let clampRing = bool.subtract(outerCylinder, innerCylinder);

  feature('base_ring', clampRing);
  ctx.log(\`Base ring: ID=\${params.tubeDiameter}mm, thickness=\${params.clampThickness}mm\`);

  // Create split gap
  const splitWidth = params.splitGap;
  const splitDepthRatio = params.splitDepth / 100;
  const splitBoxWidth = params.clampThickness * 2;
  const splitBoxHeight = height * splitDepthRatio;

  const splitBox = primitives.box(
    splitWidth,
    splitBoxWidth,
    splitBoxHeight,
    true
  );

  const splitBoxTranslated = ops.translate(splitBox, {
    x: outerRadius,
    y: 0,
    z: 0
  });

  clampRing = bool.subtract(clampRing, splitBoxTranslated);
  feature('split_gap', splitBoxTranslated);

  ctx.log(\`Split gap: \${splitWidth}mm wide, \${params.splitDepth}% depth\`);

  // Add mounting bolt holes
  if (params.boltHoles > 0) {
    const boltRadius = params.boltDiameter / 2;
    const boltCircleRadius = outerRadius - params.boltCircleOffset;

    const boltHole = primitives.cylinder(boltRadius, height * 1.2, true);
    const boltHoleTranslated = ops.translate(boltHole, {
      x: boltCircleRadius,
      y: 0,
      z: 0
    });

    const boltHoleArray = ops.circularArray(
      boltHoleTranslated,
      { x: 0, y: 0, z: 1 },
      params.boltHoles
    );

    clampRing = bool.subtract(clampRing, boltHoleArray);
    feature('mounting_holes', boltHoleArray);

    ctx.log(\`Added \${params.boltHoles} mounting holes, \${params.boltDiameter}mm diameter\`);
  }

  // Add clamping screw holes (across the split)
  if (params.includeCamping) {
    const screwRadius = params.clampScrewSize / 2;
    const screwHole = primitives.cylinder(screwRadius, params.clampThickness * 2, false);

    // Rotate to be perpendicular to split
    const screwHoleRotated = ops.rotate(screwHole, { x: 0, y: 1, z: 0 }, ctx.PI / 2);

    // Position on one side of split
    const screwOffset = outerRadius + splitWidth / 2 + params.clampThickness / 2;
    const screwHole1 = ops.translate(screwHoleRotated, {
      x: screwOffset,
      y: 0,
      z: height / 3
    });

    const screwHole2 = ops.translate(screwHoleRotated, {
      x: screwOffset,
      y: 0,
      z: -height / 3
    });

    clampRing = bool.subtract(clampRing, screwHole1, screwHole2);
    feature('clamp_screws', bool.union(screwHole1, screwHole2));

    ctx.log('Added clamping screw holes');
  }

  // Compute stats
  const volume = ctx.query.volume(clampRing);
  const surfaceArea = ctx.query.surfaceArea(clampRing);

  ctx.log(\`Tube clamp complete: volume=\${volume.toFixed(2)} mm³, area=\${surfaceArea.toFixed(2)} mm²\`);

  return clampRing;
}
`;

export const suggestedParams = {
  tubeDiameter: 200,
  clampThickness: 5,
  clampHeight: 30,
  splitGap: 5,
  splitDepth: 80,
  boltHoles: 4,
  boltDiameter: 6.5,
  boltCircleOffset: 10,
  includeClamping: true,
  clampScrewSize: 6,
};
