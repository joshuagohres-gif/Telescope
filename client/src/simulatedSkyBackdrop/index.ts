/**
 * Simulated Sky Backdrop
 *
 * A self-contained module for rendering astronomically accurate star positions
 * based on observer location and time. Features:
 *
 * - Real star catalog (20 brightest stars)
 * - Full coordinate transform pipeline:
 *   - Proper motion compensation
 *   - Precession (J2000 → current epoch)
 *   - Alt/Az conversion
 *   - Atmospheric refraction
 * - WebGL2-accelerated rendering
 * - Camera controls for panning the sky
 *
 * @example
 * ```typescript
 * import { StarBackdrop } from './simulatedSkyBackdrop';
 *
 * const backdrop = new StarBackdrop({
 *   container: document.getElementById('sky-container'),
 *   latitude: 37.7749,  // San Francisco
 *   longitude: -122.4194,
 *   time: new Date(),
 *   autoUpdateTime: true
 * });
 *
 * // Point camera at specific direction
 * backdrop.pointAtAltAz(45, 180); // 45° altitude, South
 *
 * // Update observer location
 * backdrop.setLocation(40.7128, -74.0060); // New York
 * ```
 */

// Main exports
export { StarBackdrop, createDemo } from './StarBackdrop';
export type { StarBackdropConfig } from './StarBackdrop';

// Data types (for advanced users)
export type { StarData } from './data/brightStars';

// Math utilities (for advanced users who want to do custom calculations)
export { calculateLST, dateToJD, calculateGMST } from './math/sidereal';
export { applyPrecession, applyProperMotion } from './math/precession';
export { calculateRefraction, applyRefraction, removeRefraction } from './math/refraction';
export {
  equatorialToHorizontal,
  horizontalToDirection,
  starToDirection
} from './math/altaz';
export type { HorizontalCoordinates } from './math/altaz';

// Renderer types (for advanced integration)
export type { RenderContext, RenderLayer } from './renderer/SceneHost';
