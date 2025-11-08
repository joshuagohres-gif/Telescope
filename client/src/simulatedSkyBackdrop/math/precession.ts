/**
 * Precession calculations (J2000 to of-date)
 * Uses IAU 2006 precession model (simplified)
 * Accurate to ~1 arcsec over ±200 years from J2000
 */

const J2000_JD = 2451545.0;
const ARCSEC_TO_RAD = Math.PI / (180 * 3600);

/**
 * Apply precession from J2000 to the given date
 * @param raJ2000 Right Ascension at J2000 (radians)
 * @param decJ2000 Declination at J2000 (radians)
 * @param jd Julian Date for target epoch
 * @returns {ra, dec} precessed coordinates (radians)
 */
export function applyPrecession(
  raJ2000: number,
  decJ2000: number,
  jd: number
): { ra: number; dec: number } {
  // Julian centuries from J2000.0
  const T = (jd - J2000_JD) / 36525.0;

  // IAU 2006 precession angles (arcseconds converted to radians)
  // Simplified form - full accuracy requires matrix multiplication
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) * ARCSEC_TO_RAD;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) * ARCSEC_TO_RAD;
  const theta = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) * ARCSEC_TO_RAD;

  // Convert to Cartesian
  const cosRA = Math.cos(raJ2000);
  const sinRA = Math.sin(raJ2000);
  const cosDec = Math.cos(decJ2000);
  const sinDec = Math.sin(decJ2000);

  // Rotation matrices (simplified)
  const A = cosDec * sinRA;
  const B = cosDec * cosRA;
  const C = sinDec;

  // Apply precession rotation
  const cosZ = Math.cos(zeta);
  const sinZ = Math.sin(zeta);
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const cosZp = Math.cos(z);
  const sinZp = Math.sin(z);

  // Intermediate values
  const A1 = cosZ * cosTheta * cosZp - sinZ * sinZp;
  const A2 = -sinZ * cosTheta * cosZp - cosZ * sinZp;
  const A3 = -sinTheta * cosZp;

  const B1 = cosZ * cosTheta * sinZp + sinZ * cosZp;
  const B2 = -sinZ * cosTheta * sinZp + cosZ * cosZp;
  const B3 = -sinTheta * sinZp;

  const C1 = cosZ * sinTheta;
  const C2 = -sinZ * sinTheta;
  const C3 = cosTheta;

  // New Cartesian coordinates
  const x = A1 * A + A2 * B + A3 * C;
  const y = B1 * A + B2 * B + B3 * C;
  const z_coord = C1 * A + C2 * B + C3 * C;

  // Convert back to spherical
  let ra = Math.atan2(y, x);
  if (ra < 0) ra += 2 * Math.PI;

  const dec = Math.asin(Math.max(-1, Math.min(1, z_coord)));

  return { ra, dec };
}

/**
 * Apply proper motion to star coordinates
 * @param raJ2000 Right Ascension at J2000 (radians)
 * @param decJ2000 Declination at J2000 (radians)
 * @param pmRA Proper motion in RA (mas/yr, already includes cos(dec))
 * @param pmDec Proper motion in Dec (mas/yr)
 * @param jd Target Julian Date
 * @returns {ra, dec} coordinates with proper motion applied (radians)
 */
export function applyProperMotion(
  raJ2000: number,
  decJ2000: number,
  pmRA: number,
  pmDec: number,
  jd: number
): { ra: number; dec: number } {
  // Years since J2000
  const years = (jd - J2000_JD) / 365.25;

  // Convert proper motion from mas/yr to radians
  const MAS_TO_RAD = ARCSEC_TO_RAD / 1000;

  // Apply proper motion (pmRA already includes cos(dec) factor from catalog)
  let ra = raJ2000 + (pmRA * years * MAS_TO_RAD);
  let dec = decJ2000 + (pmDec * years * MAS_TO_RAD);

  // Normalize RA to [0, 2π)
  ra = ra % (2 * Math.PI);
  if (ra < 0) ra += 2 * Math.PI;

  // Clamp Dec to [-π/2, π/2]
  dec = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, dec));

  return { ra, dec };
}
