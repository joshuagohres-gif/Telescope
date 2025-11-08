/**
 * Local Sidereal Time calculations
 * Accurate to ~0.1 seconds for dates within ±100 years of J2000
 */

const J2000 = 2451545.0; // Julian Date for J2000.0 epoch
const SECONDS_PER_DAY = 86400.0;

/**
 * Convert Date to Julian Date
 */
export function dateToJD(date: Date): number {
  const time = date.getTime();
  return (time / SECONDS_PER_DAY / 1000) + 2440587.5;
}

/**
 * Calculate Greenwich Mean Sidereal Time in radians
 * @param jd Julian Date
 * @returns GMST in radians [0, 2π)
 */
export function calculateGMST(jd: number): number {
  // Julian centuries from J2000.0
  const T = (jd - J2000) / 36525.0;

  // GMST at 0h UT (IAU 1982 formula, accurate to ~0.1s)
  let gmst = 280.46061837 + 360.98564736629 * (jd - J2000) +
             0.000387933 * T * T - T * T * T / 38710000.0;

  // Normalize to [0, 360)
  gmst = gmst % 360.0;
  if (gmst < 0) gmst += 360.0;

  // Convert to radians
  return gmst * Math.PI / 180.0;
}

/**
 * Calculate Local Sidereal Time in radians
 * @param date Observer's time
 * @param longitudeDeg Observer's longitude in degrees (positive East)
 * @returns LST in radians [0, 2π)
 */
export function calculateLST(date: Date, longitudeDeg: number): number {
  const jd = dateToJD(date);
  const gmst = calculateGMST(jd);

  // LST = GMST + longitude
  let lst = gmst + (longitudeDeg * Math.PI / 180.0);

  // Normalize to [0, 2π)
  lst = lst % (2 * Math.PI);
  if (lst < 0) lst += 2 * Math.PI;

  return lst;
}
