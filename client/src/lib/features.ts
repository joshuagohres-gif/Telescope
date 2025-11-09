/**
 * Feature Flags Configuration
 *
 * Centralized feature flag management for experimental and optional features.
 * Flags are read from environment variables and cached at runtime.
 */

interface FeatureFlags {
  // AstroDB features
  astroKBEnabled: boolean;
  astroDesignKBEnabled: boolean;
  astroOpsEnabled: boolean;
  astroCalibEnabled: boolean;
  astroTargetsEnabled: boolean;
  astroPlanQAEnabled: boolean;
  astroSkymapEnabled: boolean;

  // CAD features (experimental)
  generativeCADEnabled: boolean;
}

/**
 * Parse environment variable as boolean
 * Accepts: "true", "1", "yes" (case-insensitive) as true
 * Everything else is false
 */
function parseEnvBool(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/**
 * Get all feature flags from environment
 * Falls back to sensible defaults if env vars are missing
 */
export function getFeatureFlags(): FeatureFlags {
  // In Vite, environment variables are exposed via import.meta.env
  // Variables must be prefixed with VITE_ to be exposed to client
  // However, for server-side rendering or SSR contexts, we may access process.env
  const env = typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : (typeof process !== 'undefined' ? process.env : {});

  return {
    // AstroDB features (enabled by default)
    astroKBEnabled: parseEnvBool(env.ASTRO_KB_ENABLED) ?? true,
    astroDesignKBEnabled: parseEnvBool(env.ASTRO_DESIGN_KB_ENABLED) ?? true,
    astroOpsEnabled: parseEnvBool(env.ASTRO_OPS_ENABLED) ?? true,
    astroCalibEnabled: parseEnvBool(env.ASTRO_CALIB_ENABLED) ?? true,
    astroTargetsEnabled: parseEnvBool(env.ASTRO_TARGETS_ENABLED) ?? true,
    astroPlanQAEnabled: parseEnvBool(env.ASTRO_PLANQA_ENABLED) ?? true,
    astroSkymapEnabled: parseEnvBool(env.ASTRO_SKYMAP_ENABLED) ?? true,

    // CAD features (disabled by default - experimental)
    generativeCADEnabled: parseEnvBool(env.GENERATIVE_CAD_ENABLED) ?? false,
  };
}

/**
 * Singleton cached feature flags
 * Initialized once on first access to avoid re-parsing env vars
 */
let cachedFlags: FeatureFlags | null = null;

export function features(): FeatureFlags {
  if (!cachedFlags) {
    cachedFlags = getFeatureFlags();
  }
  return cachedFlags;
}

/**
 * Reset cached flags (useful for testing or dynamic config updates)
 */
export function resetFeatureFlags(): void {
  cachedFlags = null;
}

// Named exports for convenience
export const isCADEnabled = () => features().generativeCADEnabled;
export const isAstroKBEnabled = () => features().astroKBEnabled;
export const isOpsEnabled = () => features().astroOpsEnabled;
