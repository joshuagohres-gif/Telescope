/**
 * Atmospheric refraction calculations
 * Uses Saemundsson formula (accurate to ~0.1' for alt > 15°)
 */

/**
 * Calculate atmospheric refraction correction
 * @param altitudeDeg True altitude in degrees
 * @param temperatureC Temperature in Celsius (default 10°C)
 * @param pressureMbar Pressure in millibars (default 1010 mbar)
 * @returns Refraction correction in degrees (add to true altitude to get apparent)
 */
export function calculateRefraction(
  altitudeDeg: number,
  temperatureC: number = 10,
  pressureMbar: number = 1010
): number {
  // Don't apply refraction below horizon or at zenith
  if (altitudeDeg <= -1 || altitudeDeg >= 90) {
    return 0;
  }

  // Saemundsson formula (1986)
  // R = 1.02 / tan(h + 10.3/(h + 5.11)) arcmin
  // Valid for h > -1°, most accurate for h > 15°

  const h = altitudeDeg;

  // Basic refraction in arcminutes
  let R = 1.02 / Math.tan((h + 10.3 / (h + 5.11)) * Math.PI / 180);

  // Apply atmospheric conditions correction
  // Standard: 10°C, 1010 mbar
  const pressureFactor = pressureMbar / 1010;
  const tempFactor = 283 / (273 + temperatureC);

  R = R * pressureFactor * tempFactor;

  // Convert arcminutes to degrees
  return R / 60;
}

/**
 * Apply refraction to convert true altitude to apparent altitude
 * @param trueAltDeg True geometric altitude in degrees
 * @param temperatureC Temperature in Celsius
 * @param pressureMbar Pressure in millibars
 * @returns Apparent altitude in degrees
 */
export function applyRefraction(
  trueAltDeg: number,
  temperatureC: number = 10,
  pressureMbar: number = 1010
): number {
  const refraction = calculateRefraction(trueAltDeg, temperatureC, pressureMbar);
  return trueAltDeg + refraction;
}

/**
 * Remove refraction to convert apparent altitude to true altitude
 * (iterative method for accuracy)
 * @param apparentAltDeg Apparent altitude in degrees
 * @param temperatureC Temperature in Celsius
 * @param pressureMbar Pressure in millibars
 * @returns True altitude in degrees
 */
export function removeRefraction(
  apparentAltDeg: number,
  temperatureC: number = 10,
  pressureMbar: number = 1010
): number {
  let trueAlt = apparentAltDeg;

  // Iterate to find true altitude (usually converges in 2-3 iterations)
  for (let i = 0; i < 5; i++) {
    const refraction = calculateRefraction(trueAlt, temperatureC, pressureMbar);
    trueAlt = apparentAltDeg - refraction;
  }

  return trueAlt;
}
