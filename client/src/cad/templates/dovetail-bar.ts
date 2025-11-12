/**
 * Template: Dovetail Mounting Bar
 *
 * Standard dovetail bar for telescope mounting (Losmandy or Vixen style).
 */

import type { ParamSchema } from '../types/param-schema';

export const templateName = 'Dovetail Bar';
export const templateDescription = 'Standard dovetail mounting bar (Losmandy or Vixen)';
export const templateTags = ['dovetail', 'mounting', 'bar'];

export const paramSchema: ParamSchema = {
  version: '1.0',
  name: 'Dovetail Bar',
  description: 'Standard dovetail mounting bar',
  author: 'Telescope CAD Templates',
  tags: ['dovetail', 'mounting'],
  params: {
    style: {
      type: 'enum',
      label: 'Dovetail Style',
      default: 'losmandy',
      options: [
        { value: 'losmandy', label: 'Losmandy (75mm wide)' },
        { value: 'vixen', label: 'Vixen (44mm wide)' },
      ],
      group: 'Style',
    },
    length: {
      type: 'number',
      label: 'Bar Length',
      default: 200,
      min: 100,
      max: 500,
      units: 'mm',
      group: 'Dimensions',
    },
    thickness: {
      type: 'number',
      label: 'Base Thickness',
      default: 12,
      min: 8,
      max: 20,
      units: 'mm',
      group: 'Dimensions',
    },
    slotCount: {
      type: 'integer',
      label: 'Number of Slots',
      default: 4,
      min: 2,
      max: 10,
      group: 'Features',
    },
    slotDiameter: {
      type: 'number',
      label: 'Slot Diameter',
      default: 8.5,
      min: 6,
      max: 12,
      units: 'mm',
      group: 'Features',
    },
  },
  constraints: [],
};

export const cadScript = `
function build(ctx, params) {
  const { primitives, ops, bool, feature } = ctx;

  // Dovetail profile dimensions
  const isLosmandy = params.style === 'losmandy';
  const baseWidth = isLosmandy ? 75 : 44;
  const topWidth = isLosmandy ? 60 : 38;
  const dovetailHeight = isLosmandy ? 18 : 14;
  const angle = Math.atan2((baseWidth - topWidth) / 2, dovetailHeight);

  ctx.log(\`Creating \${params.style} dovetail bar, \${params.length}mm long\`);

  // Create base profile using sketch
  const profile = primitives.sketch()
    .moveTo(-baseWidth / 2, 0)
    .lineTo(baseWidth / 2, 0)
    .lineTo(topWidth / 2, dovetailHeight)
    .lineTo(-topWidth / 2, dovetailHeight)
    .lineTo(-baseWidth / 2, 0)
    .toWire();

  // Extrude to length
  const bar = ops.extrude(profile, params.length, { x: 0, y: 0, z: 1 });

  feature('dovetail_bar', bar);

  // Add mounting slots
  if (params.slotCount > 0) {
    const slotSpacing = params.length / (params.slotCount + 1);
    const slotRadius = params.slotDiameter / 2;

    for (let i = 1; i <= params.slotCount; i++) {
      const slotZ = -params.length / 2 + slotSpacing * i;
      const slot = primitives.cylinder(slotRadius, params.thickness * 2, false);
      const slotRotated = ops.rotate(slot, { x: 1, y: 0, z: 0 }, ctx.PI / 2);
      const slotPositioned = ops.translate(slotRotated, {
        x: 0,
        y: dovetailHeight / 2,
        z: slotZ
      });

      bar = bool.subtract(bar, slotPositioned);
    }

    feature('mounting_slots', null);
    ctx.log(\`Added \${params.slotCount} mounting slots\`);
  }

  const volume = ctx.query.volume(bar);
  ctx.log(\`Dovetail bar complete: volume=\${volume.toFixed(2)} mm³\`);

  return bar;
}
`;

export const suggestedParams = {
  style: 'losmandy',
  length: 200,
  thickness: 12,
  slotCount: 4,
  slotDiameter: 8.5,
};
