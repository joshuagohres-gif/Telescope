/**
 * Feature Flags Configuration
 * 
 * Centralized feature flag management for AstroDB API packs.
 * Each pack can be enabled/disabled via environment variables.
 */

export interface FeatureFlags {
  ops: boolean;
  targets: boolean;
  calib: boolean;
  planqa: boolean;
  skymap: boolean;
}

/**
 * Check if Operations Pack is enabled
 */
export function isOpsEnabled(): boolean {
  return process.env.ASTRO_OPS_ENABLED === "true";
}

/**
 * Check if Targets Pack is enabled
 */
export function isTargetsEnabled(): boolean {
  return process.env.ASTRO_TARGETS_ENABLED === "true";
}

/**
 * Check if Calibration Pack is enabled
 */
export function isCalibEnabled(): boolean {
  return process.env.ASTRO_CALIB_ENABLED === "true";
}

/**
 * Check if Plan & QA Pack is enabled
 */
export function isPlanqaEnabled(): boolean {
  return process.env.ASTRO_PLANQA_ENABLED === "true";
}

/**
 * Check if Community Sky Map is enabled
 */
export function isSkymapEnabled(): boolean {
  return process.env.ASTRO_SKYMAP_ENABLED === "true";
}

/**
 * Get all feature flags
 */
export function getAllFlags(): FeatureFlags {
  return {
    ops: isOpsEnabled(),
    targets: isTargetsEnabled(),
    calib: isCalibEnabled(),
    planqa: isPlanqaEnabled(),
    skymap: isSkymapEnabled(),
  };
}

/**
 * Get list of enabled pack names
 */
export function getEnabledPacks(): string[] {
  const flags = getAllFlags();
  return Object.entries(flags)
    .filter(([_, enabled]) => enabled)
    .map(([name, _]) => name);
}
