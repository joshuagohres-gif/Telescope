/**
 * Template: Finder Scope Rings
 *
 * Mounting rings for finder scopes with adjustable base plate.
 */

import type { ParamSchema } from '../types/param-schema';

export const templateName = 'Finder Scope Rings';
export const templateDescription = 'Finder scope mounting rings with base plate and adjustment screws';
export const templateTags = ['finder', 'rings', 'mounting'];

export const paramSchema: ParamSchema = {
  version: '1.0',
  name: 'Finder Scope Rings',
  description: 'Finder scope mounting ring assembly',
  author: 'Telescope CAD Templates',
  tags: ['finder', 'rings'],
  params: {
    scopeDiameter: {
      type: 'number',
      label: 'Finder Scope Diameter',
      default: 50,
      min: 30,
      max: 80,
      units: 'mm',
      group: 'Scope',
    },
    ringWidth: {
      type: 'number',
      label: 'Ring Width',
      default: 15,
      min: 10,
      max: 30,
      units: 'mm',
      group: 'Rings',
    },
    ringThickness: {
      type: 'number',
      label: 'Ring Wall Thickness',
      default: 3,
      min: 2,
      max: 8,
      units: 'mm',
      group: 'Rings',
    },
    baseWidth: {
      type: 'number',
      label: 'Base Plate Width',
      default: 40,
      min: 30,
      max: 80,
      units: 'mm',
      group: 'Base',
    },
    baseThickness: {
      type: 'number',
      label: 'Base Plate Thickness',
      default: 6,
      min: 3,
      max: 12,
      units: 'mm',
      group: 'Base',
    },
    spacing: {
      type: 'number',
      label: 'Ring Spacing',
      default: 80,
      min: 50,
      max: 150,
      units: 'mm',
      group: 'Configuration',
    },
    screwSize: {
      type: 'number',
      label: 'Adjustment Screw Size',
      default: 6,
      min: 4,
      max: 8,
      units: 'mm',
      group: 'Fasteners',
    },
  },
  constraints: [
    {
      expression: 'baseWidth > scopeDiameter + ringThickness * 2 + 10',
      message: 'Base plate too narrow for ring diameter',
    },
    {
      expression: 'ringThickness < scopeDiameter / 10',
      message: 'Ring thickness too large for scope',
    },
  ],
};

export const cadScript = `
function build(ctx, params) {
  const { primitives, ops, bool, feature } = ctx;

  const innerRadius = params.scopeDiameter / 2;
  const outerRadius = innerRadius + params.ringThickness;

  ctx.log('Creating finder scope rings...');

  // Create single ring (half-ring with split)
  const outerCyl = primitives.cylinder(outerRadius, params.ringWidth, true);
  const innerCyl = primitives.cylinder(innerRadius, params.ringWidth * 1.2, true);
  let ring = bool.subtract(outerCyl, innerCyl);

  // Cut bottom half off (create semicircle)
  const cutBox = primitives.box(
    outerRadius * 3,
    outerRadius * 2,
    params.ringWidth * 2,
    true
  );
  const cutBoxTranslated = ops.translate(cutBox, {
    x: 0,
    y: -outerRadius,
    z: 0
  });
  ring = bool.subtract(ring, cutBoxTranslated);

  feature('single_ring', ring);

  // Create base plate
  const baseLength = params.spacing + params.ringWidth * 2;
  const basePlate = primitives.box(
    params.baseWidth,
    params.baseThickness,
    baseLength,
    false
  );

  const basePlatePositioned = ops.translate(basePlate, {
    x: -params.baseWidth / 2,
    y: -outerRadius - params.baseThickness,
    z: -baseLength / 2
  });

  feature('base_plate', basePlatePositioned);

  // Position two rings on base
  const ring1 = ops.translate(ring, {
    x: 0,
    y: 0,
    z: -params.spacing / 2
  });

  const ring2 = ops.translate(ring, {
    x: 0,
    y: 0,
    z: params.spacing / 2
  });

  // Combine all parts
  let assembly = bool.union(basePlatePositioned, ring1, ring2);

  feature('rings', bool.union(ring1, ring2));

  // Add adjustment screw holes
  const screwRadius = params.screwSize / 2;
  const screwHole = primitives.cylinder(screwRadius, params.baseThickness * 2, false);
  const screwHoleRotated = ops.rotate(screwHole, { x: 1, y: 0, z: 0 }, ctx.PI / 2);

  // Add 2 screws per ring (left and right sides)
  const screwOffset = params.baseWidth / 3;

  for (const zPos of [-params.spacing / 2, params.spacing / 2]) {
    const screwLeft = ops.translate(screwHoleRotated, {
      x: -screwOffset,
      y: -outerRadius - params.baseThickness / 2,
      z: zPos
    });

    const screwRight = ops.translate(screwHoleRotated, {
      x: screwOffset,
      y: -outerRadius - params.baseThickness / 2,
      z: zPos
    });

    assembly = bool.subtract(assembly, screwLeft, screwRight);
  }

  feature('adjustment_screws', null);
  ctx.log('Added 4 adjustment screw holes');

  const volume = ctx.query.volume(assembly);
  ctx.log(\`Finder rings complete: volume=\${volume.toFixed(2)} mm³\`);

  return assembly;
}
`;

export const suggestedParams = {
  scopeDiameter: 50,
  ringWidth: 15,
  ringThickness: 3,
  baseWidth: 40,
  baseThickness: 6,
  spacing: 80,
  screwSize: 6,
};
