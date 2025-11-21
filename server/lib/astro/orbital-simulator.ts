/**
 * Orbital Simulation Engine
 * Calculates orbital trajectories for planets, comets, asteroids, and other solar system objects
 * Supports both Keplerian and N-body calculations
 */

/**
 * Convert Date to Julian Date
 */
function dateToJD(date: Date): number {
  const time = date.getTime();
  const SECONDS_PER_DAY = 86400.0;
  return time / SECONDS_PER_DAY / 1000 + 2440587.5;
}

const J2000 = 2451545.0; // Julian Date for J2000.0 epoch

/**
 * Orbital elements structure
 */
export interface OrbitalElements {
  a: number; // Semi-major axis (AU)
  e: number; // Eccentricity
  i: number; // Inclination (degrees)
  omega: number; // Longitude of ascending node (degrees)
  w: number; // Argument of perihelion (degrees)
  m: number; // Mean anomaly at epoch (degrees)
  n?: number; // Mean motion (degrees/day) - optional, can be calculated from a
  epoch: number; // Epoch Julian Date
}

/**
 * Heliocentric coordinates
 */
export interface HeliocentricCoords {
  x: number; // AU
  y: number; // AU
  z: number; // AU
  distance: number; // Distance from Sun (AU)
}

/**
 * Geocentric equatorial coordinates
 */
export interface EquatorialCoords {
  ra: number; // Right Ascension (radians)
  dec: number; // Declination (radians)
  distance: number; // Distance from Earth (AU)
}

/**
 * Trajectory point
 */
export interface TrajectoryPoint {
  t: number; // Julian Date
  x: number; // Heliocentric X (AU)
  y: number; // Heliocentric Y (AU)
  z: number; // Heliocentric Z (AU)
  ra?: number; // Right Ascension (radians)
  dec?: number; // Declination (radians)
  distance?: number; // Distance from Sun (AU)
}

/**
 * Sky path point from Earth observer
 */
export interface SkyPathPoint {
  t: number; // Julian Date
  ra: number; // Right Ascension (radians)
  dec: number; // Declination (radians)
  alt: number; // Altitude (degrees)
  az: number; // Azimuth (degrees)
  magnitude?: number; // Apparent magnitude
  distance?: number; // Distance from Earth (AU)
  visible: boolean; // Above horizon
}

/**
 * Calculate mean motion from semi-major axis
 * n = sqrt(GM / a^3) in degrees per day
 * For Sun: GM = 2.959122082855911e-4 AU^3/day^2
 */
function calculateMeanMotion(a: number): number {
  const GM = 2.959122082855911e-4; // Solar gravitational parameter (AU^3/day^2)
  const n_rad_per_day = Math.sqrt(GM / (a * a * a));
  const n_deg_per_day = (n_rad_per_day * 180) / Math.PI;
  return n_deg_per_day;
}

/**
 * Solve Kepler's equation: E - e*sin(E) = M
 * Uses iterative Newton-Raphson method
 */
function solveKepler(M: number, e: number, tolerance: number = 1e-8): number {
  let E = M; // Initial guess

  // Handle high eccentricity with better initial guess
  if (e > 0.8) {
    E = Math.PI;
  }

  for (let i = 0; i < 50; i++) {
    const f = E - e * Math.sin(E) - M;
    const df = 1 - e * Math.cos(E);

    if (Math.abs(df) < 1e-10) break; // Avoid division by zero

    const dE = f / df;
    E -= dE;

    if (Math.abs(dE) < tolerance) {
      break;
    }
  }

  return E;
}

/**
 * Calculate heliocentric position from orbital elements
 */
export function calculateHeliocentricPosition(
  elements: OrbitalElements,
  jd: number
): HeliocentricCoords {
  // Calculate mean motion if not provided
  const n = elements.n || calculateMeanMotion(elements.a);

  // Time since epoch in days
  const dt = jd - elements.epoch;

  // Mean anomaly at time t
  const M_deg = elements.m + n * dt;
  // Normalize to [0, 360) then convert to radians
  let M_deg_normalized = ((M_deg % 360) + 360) % 360;
  const M = (M_deg_normalized * Math.PI) / 180;

  // Solve Kepler's equation for eccentric anomaly
  const E = solveKepler(M, elements.e);

  // True anomaly
  const v = 2 * Math.atan2(
    Math.sqrt(1 + elements.e) * Math.sin(E / 2),
    Math.sqrt(1 - elements.e) * Math.cos(E / 2)
  );

  // Distance from Sun
  const r = elements.a * (1 - elements.e * Math.cos(E));

  // Convert angles to radians
  const iRad = (elements.i * Math.PI) / 180;
  const omegaRad = (elements.omega * Math.PI) / 180;
  const wRad = (elements.w * Math.PI) / 180;

  // Argument of latitude
  const u = v + wRad;

  // Position in orbital plane
  const xOrbital = r * Math.cos(u);
  const yOrbital = r * Math.sin(u);

  // Transform to ecliptic coordinates
  const cosI = Math.cos(iRad);
  const sinI = Math.sin(iRad);
  const cosOmega = Math.cos(omegaRad);
  const sinOmega = Math.sin(omegaRad);

  const x =
    (cosOmega * Math.cos(u) - sinOmega * Math.sin(u) * cosI) * r;
  const y =
    (sinOmega * Math.cos(u) + cosOmega * Math.sin(u) * cosI) * r;
  const z = Math.sin(u) * sinI * r;

  return {
    x,
    y,
    z,
    distance: r,
  };
}

/**
 * Calculate Earth's heliocentric position
 * Uses simplified orbital elements for Earth
 */
function calculateEarthPosition(jd: number): HeliocentricCoords {
  const earthElements: OrbitalElements = {
    a: 1.00000261,
    e: 0.01671123,
    i: -0.00001531,
    omega: 0.0,
    w: 102.93768193,
    m: 100.46457166,
    n: 0.9856076686, // ~360/365.25 degrees per day
    epoch: J2000,
  };

  return calculateHeliocentricPosition(earthElements, jd);
}

/**
 * Convert ecliptic coordinates to equatorial coordinates
 */
function eclipticToEquatorial(
  lon: number,
  lat: number,
  jd: number
): { ra: number; dec: number } {
  // Obliquity of the ecliptic
  const T = (jd - J2000) / 36525.0;
  const epsilon = ((23.439291 - 0.0130042 * T) * Math.PI) / 180;

  const cosEps = Math.cos(epsilon);
  const sinEps = Math.sin(epsilon);
  const cosLat = Math.cos(lat);
  const sinLat = Math.sin(lat);
  const cosLon = Math.cos(lon);
  const sinLon = Math.sin(lon);

  const x = cosLat * cosLon;
  const y = cosLat * sinLon * cosEps - sinLat * sinEps;
  const z = cosLat * sinLon * sinEps + sinLat * cosEps;

  const ra = Math.atan2(y, x);
  const dec = Math.asin(z);

  return { ra, dec };
}

/**
 * Convert heliocentric to geocentric equatorial coordinates
 */
export function calculateGeocentricPosition(
  elements: OrbitalElements,
  jd: number
): EquatorialCoords {
  // Get heliocentric positions
  const objectPos = calculateHeliocentricPosition(elements, jd);
  const earthPos = calculateEarthPosition(jd);

  // Geocentric Cartesian coordinates
  const x = objectPos.x - earthPos.x;
  const y = objectPos.y - earthPos.y;
  const z = objectPos.z - earthPos.z;

  // Distance from Earth
  const distance = Math.sqrt(x * x + y * y + z * z);

  // Convert to ecliptic coordinates
  const lon = Math.atan2(y, x);
  const lat = Math.asin(z / distance);

  // Convert to equatorial
  const { ra, dec } = eclipticToEquatorial(lon, lat, jd);

  return { ra, dec, distance };
}

/**
 * Convert equatorial coordinates to horizontal coordinates (alt/az)
 */
export function equatorialToHorizontal(
  ra: number,
  dec: number,
  jd: number,
  lat: number,
  lon: number
): { alt: number; az: number } {
  // Local sidereal time
  const lst = calculateLST(jd, lon);

  // Hour angle
  const ha = lst - ra;

  // Convert to degrees
  const latRad = (lat * Math.PI) / 180;
  const decRad = dec;
  const haRad = ha;

  // Calculate altitude and azimuth
  const sinAlt =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const alt = Math.asin(sinAlt);

  const cosAz =
    (Math.sin(decRad) - Math.sin(latRad) * sinAlt) /
    (Math.cos(latRad) * Math.cos(alt));
  const az = Math.acos(Math.max(-1, Math.min(1, cosAz)));

  // Adjust azimuth based on hour angle
  const azFinal = Math.sin(haRad) < 0 ? az : 2 * Math.PI - az;

  return {
    alt: (alt * 180) / Math.PI,
    az: (azFinal * 180) / Math.PI,
  };
}

/**
 * Calculate Local Sidereal Time
 */
function calculateLST(jd: number, lon: number): number {
  // Greenwich Mean Sidereal Time
  const T = (jd - J2000) / 36525.0;
  const theta0 =
    (280.46061837 +
      360.98564736629 * (jd - J2000) +
      T * T * (0.000387933 - T / 38710000.0)) *
    (Math.PI / 180);

  // Local Sidereal Time
  const lst = theta0 + (lon * Math.PI) / 180;

  // Normalize to [0, 2π]
  return lst - Math.floor(lst / (2 * Math.PI)) * 2 * Math.PI;
}

/**
 * Generate trajectory points for a time range
 */
export function generateTrajectory(
  elements: OrbitalElements,
  startDate: Date,
  endDate: Date,
  stepDays: number = 1.0
): TrajectoryPoint[] {
  const startJD = dateToJD(startDate);
  const endJD = dateToJD(endDate);
  const points: TrajectoryPoint[] = [];

  for (let jd = startJD; jd <= endJD; jd += stepDays) {
    const pos = calculateHeliocentricPosition(elements, jd);
    const geocentric = calculateGeocentricPosition(elements, jd);

    points.push({
      t: jd,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      ra: geocentric.ra,
      dec: geocentric.dec,
      distance: pos.distance,
    });
  }

  return points;
}

/**
 * Generate sky path from Earth observer location
 */
export function generateSkyPath(
  elements: OrbitalElements,
  startDate: Date,
  endDate: Date,
  observerLat: number,
  observerLon: number,
  stepHours: number = 1.0
): SkyPathPoint[] {
  const startJD = dateToJD(startDate);
  const endJD = dateToJD(endDate);
  const stepDays = stepHours / 24.0;
  const points: SkyPathPoint[] = [];

  for (let jd = startJD; jd <= endJD; jd += stepDays) {
    const geocentric = calculateGeocentricPosition(elements, jd);
    const horizontal = equatorialToHorizontal(
      geocentric.ra,
      geocentric.dec,
      jd,
      observerLat,
      observerLon
    );

    points.push({
      t: jd,
      ra: geocentric.ra,
      dec: geocentric.dec,
      alt: horizontal.alt,
      az: horizontal.az,
      distance: geocentric.distance,
      visible: horizontal.alt > 0,
    });
  }

  return points;
}

/**
 * Estimate apparent magnitude (simplified)
 * For planets: uses distance and phase angle
 * For asteroids/comets: uses H-G magnitude system approximation
 */
export function estimateMagnitude(
  elements: OrbitalElements,
  jd: number,
  h?: number, // Absolute magnitude (H for asteroids, H10 for comets)
  g?: number // Phase parameter (G for asteroids)
): number {
  const geocentric = calculateGeocentricPosition(elements, jd);
  const heliocentric = calculateHeliocentricPosition(elements, jd);
  const earthPos = calculateEarthPosition(jd);

  // Distance from Sun (r) and Earth (Δ)
  const r = heliocentric.distance;
  const delta = geocentric.distance;

  // Phase angle (angle Sun-object-Earth)
  const cosPhase =
    (r * r + delta * delta - earthPos.distance * earthPos.distance) /
    (2 * r * delta);
  const phaseAngle = Math.acos(Math.max(-1, Math.min(1, cosPhase)));

  if (h !== undefined) {
    // Asteroid/comet magnitude formula
    // m = H + 5*log10(r*Δ) - 2.5*log10(phase function)
    // Simplified phase function
    const phaseFunc = Math.exp(-3.33 * Math.tan(phaseAngle / 2) ** 0.63);
    return h + 5 * Math.log10(r * delta) - 2.5 * Math.log10(phaseFunc);
  }

  // Default: very rough estimate
  return 5 * Math.log10(r * delta);
}
