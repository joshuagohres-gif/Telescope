/**
 * Template: Secondary Mirror Spider Vanes
 *
 * Spider vane assembly for supporting secondary mirror in reflector telescopes.
 */

import type { ParamSchema } from '../types/param-schema';

export const templateName = 'Spider Vanes';
export const templateDescription = 'Secondary mirror spider vane assembly for reflector telescopes';
export const templateTags = ['spider', 'vanes', 'secondary', 'mirror'];

export const paramSchema: ParamSchema = {
  version: '1.0',
  name: 'Spider Vanes',
  description: 'Secondary mirror spider vane assembly',
  author: 'Telescope CAD Templates',
  tags: ['spider', 'vanes', 'secondary'],
  params: {
    vaneCount: {
      type: 'enum',
      label: 'Number of Vanes',
      default: '4',
      options: [
        { value: '3', label: '3 Vanes (120°)' },
        { value: '4', label: '4 Vanes (90°)' },
      ],
      group: 'Configuration',
    },
    tubeDiameter: {
      type: 'number',
      label: 'Tube Inner Diameter',
      default: 250,
      min: 100,
      max: 600,
      units: 'mm',
      group: 'Dimensions',
    },
    vaneWidth: {
      type: 'number',
      label: 'Vane Width',
      default: 10,
      min: 5,
      max: 30,
      units: 'mm',
      group: 'Vanes',
    },
    vaneThickness: {
      type: 'number',
      label: 'Vane Thickness',
      default: 1.5,
      min: 0.5,
      max: 5,
      units: 'mm',
      group: 'Vanes',
    },
    hubDiameter: {
      type: 'number',
      label: 'Center Hub Diameter',
      default: 40,
      min: 20,
      max: 80,
      units: 'mm',
      group: 'Hub',
    },
    hubThickness: {
      type: 'number',
      label: 'Hub Thickness',
      default: 10,
      min: 5,
      max: 20,
      units: 'mm',
      group: 'Hub',
    },
    mountingHoles: {
      type: 'integer',
      label: 'Hub Mounting Holes',
      default: 3,
      min: 3,
      max: 6,
      group: 'Hub',
    },
  },
  constraints: [
    {
      expression: 'hubDiameter < tubeDiameter / 3',
      message: 'Hub too large for tube diameter',
    },
    {
      expression: 'vaneWidth < tubeDiameter / 10',
      message: 'Vanes too wide for tube',
    },
  ],
};

export const cadScript = `
function build(ctx, params) {
  const { primitives, ops, bool, feature } = ctx;

  const vaneCount = parseInt(params.vaneCount);
  const tubeRadius = params.tubeDiameter / 2;
  const vaneLength = tubeRadius - params.hubDiameter / 2;

  ctx.log(\`Creating spider with \${vaneCount} vanes for \${params.tubeDiameter}mm tube\`);

  // Create center hub
  const hub = primitives.cylinder(
    params.hubDiameter / 2,
    params.hubThickness,
    true
  );

  feature('center_hub', hub);

  // Create single vane
  const vane = primitives.box(
    params.vaneWidth,
    vaneLength,
    params.vaneThickness,
    false
  );

  const vaneTranslated = ops.translate(vane, {
    x: -params.vaneWidth / 2,
    y: params.hubDiameter / 2,
    z: -params.vaneThickness / 2
  });

  // Create vane array
  const vaneArray = ops.circularArray(
    vaneTranslated,
    { x: 0, y: 0, z: 1 },
    vaneCount
  );

  feature('vanes', vaneArray);

  // Combine hub and vanes
  let spider = bool.union(hub, vaneArray);

  // Add mounting holes in hub
  if (params.mountingHoles > 0) {
    const holeRadius = 2;
    const holeCircleRadius = params.hubDiameter / 3;

    const hole = primitives.cylinder(holeRadius, params.hubThickness * 1.2, true);
    const holeTranslated = ops.translate(hole, {
      x: holeCircleRadius,
      y: 0,
      z: 0
    });

    const holeArray = ops.circularArray(
      holeTranslated,
      { x: 0, y: 0, z: 1 },
      params.mountingHoles
    );

    spider = bool.subtract(spider, holeArray);
    feature('mounting_holes', holeArray);

    ctx.log(\`Added \${params.mountingHoles} mounting holes\`);
  }

  const volume = ctx.query.volume(spider);
  ctx.log(\`Spider complete: volume=\${volume.toFixed(2)} mm³\`);

  return spider;
}
`;

export const suggestedParams = {
  vaneCount: '4',
  tubeDiameter: 250,
  vaneWidth: 10,
  vaneThickness: 1.5,
  hubDiameter: 40,
  hubThickness: 10,
  mountingHoles: 3,
};
