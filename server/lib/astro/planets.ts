/**
 * Planetary position calculations using simplified Keplerian orbital elements
 * Server-side implementation matching client calculations
 * Based on JPL low-precision formulas (good to ~1 arcminute for dates 1800-2050)
 */

const J2000 = 2451545.0; // Julian Date for J2000.0 epoch

interface OrbitalElements {
  a: number;      // Semi-major axis (AU)
  e: number;      // Eccentricity
  i: number;      // Inclination (degrees)
  L: number;      // Mean longitude (degrees)
  longPeri: number; // Longitude of perihelion (degrees)
  longNode: number; // Longitude of ascending node (degrees)
}

interface ElementRates {
  a: number;
  e: number;
  i: number;
  L: number;
  longPeri: number;
  longNode: number;
}

interface PlanetData {
  name: string;
  elements: OrbitalElements;
  rates: ElementRates;
  color: [number, number, number]; // RGB
  apparentMagnitude: number;
}

/**
 * Orbital elements and rates for major planets (J2000.0 epoch)
 * Source: JPL Solar System Dynamics
 */
const PLANET_DATA: Record<string, PlanetData> = {
  Mercury: {
    name: 'Mercury',
    elements: { a: 0.38709927, e: 0.20563593, i: 7.00497902, L: 252.25032350, longPeri: 77.45779628, longNode: 48.33076593 },
    rates: { a: 0.00000037, e: 0.00001906, i: -0.00594749, L: 149472.67411175, longPeri: 0.16047689, longNode: -0.12534081 },
    color: [0.7, 0.7, 0.7],
    apparentMagnitude: -0.5,
  },
  Venus: {
    name: 'Venus',
    elements: { a: 0.72333566, e: 0.00677672, i: 3.39467605, L: 181.97909950, longPeri: 131.60246718, longNode: 76.67984255 },
    rates: { a: 0.00000390, e: -0.00004107, i: -0.00078890, L: 58517.81538729, longPeri: 0.00268329, longNode: -0.27769418 },
    color: [0.9, 0.9, 0.7],
    apparentMagnitude: -4.0,
  },
  Mars: {
    name: 'Mars',
    elements: { a: 1.52371034, e: 0.09339410, i: 1.84969142, L: -4.55343205, longPeri: -23.94362959, longNode: 49.55953891 },
    rates: { a: 0.00001847, e: 0.00007882, i: -0.00813131, L: 19140.30268499, longPeri: 0.44441088, longNode: -0.29257343 },
    color: [1.0, 0.5, 0.3],
    apparentMagnitude: -1.0,
  },
  Jupiter: {
    name: 'Jupiter',
    elements: { a: 5.20288700, e: 0.04838624, i: 1.30439695, L: 34.39644051, longPeri: 14.72847983, longNode: 100.47390909 },
    rates: { a: -0.00011607, e: -0.00013253, i: -0.00183714, L: 3034.74612775, longPeri: 0.21252668, longNode: 0.20469106 },
    color: [0.9, 0.8, 0.6],
    apparentMagnitude: -2.5,
  },
  Saturn: {
    name: 'Saturn',
    elements: { a: 9.53667594, e: 0.05386179, i: 2.48599187, L: 49.95424423, longPeri: 92.59887831, longNode: 113.66242448 },
    rates: { a: -0.00125060, e: -0.00050991, i: 0.00193609, L: 1222.49362201, longPeri: -0.41897216, longNode: -0.28867794 },
    color: [0.9, 0.85, 0.6],
    apparentMagnitude: 0.5,
  },
  Uranus: {
    name: 'Uranus',
    elements: { a: 19.18916464, e: 0.04725744, i: 0.77263783, L: 313.23810451, longPeri: 170.95427630, longNode: 74.01692503 },
    rates: { a: -0.00196176, e: -0.00004397, i: -0.00242939, L: 428.48202785, longPeri: 0.40805281, longNode: 0.04240589 },
    color: [0.6, 0.8, 0.9],
    apparentMagnitude: 5.5,
  },
  Neptune: {
    name: 'Neptune',
    elements: { a: 30.06992276, e: 0.00859048, i: 1.77004347, L: -55.12002969, longPeri: 44.96476227, longNode: 131.78422574 },
    rates: { a: 0.00026291, e: 0.00005105, i: 0.00035372, L: 218.45945325, longPeri: -0.32241464, longNode: -0.00508664 },
    color: [0.4, 0.5, 0.9],
    apparentMagnitude: 7.8,
  },
};

function dateToJD(date: Date): number {
  const time = date.getTime();
  return (time / 86400000) + 2440587.5;
}

function computeElements(planet: PlanetData, jd: number): OrbitalElements {
  const T = (jd - J2000) / 36525.0; // Julian centuries from J2000

  return {
    a: planet.elements.a + planet.rates.a * T,
    e: planet.elements.e + planet.rates.e * T,
    i: planet.elements.i + planet.rates.i * T,
    L: planet.elements.L + planet.rates.L * T,
    longPeri: planet.elements.longPeri + planet.rates.longPeri * T,
    longNode: planet.elements.longNode + planet.rates.longNode * T,
  };
}

function solveKepler(M: number, e: number, tolerance: number = 1e-6): number {
  let E = M;
  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < tolerance) break;
  }
  return E;
}

function planetHeliocentricPosition(planet: PlanetData, jd: number) {
  const elem = computeElements(planet, jd);
  const argPeri = elem.longPeri - elem.longNode;

  let M = elem.L - elem.longPeri;
  M = ((M + 180) % 360 - 180) * Math.PI / 180;

  const E = solveKepler(M, elem.e);
  const v = 2 * Math.atan2(
    Math.sqrt(1 + elem.e) * Math.sin(E / 2),
    Math.sqrt(1 - elem.e) * Math.cos(E / 2)
  );

  const r = elem.a * (1 - elem.e * Math.cos(E));

  const iRad = elem.i * Math.PI / 180;
  const argPeriRad = argPeri * Math.PI / 180;
  const longNodeRad = elem.longNode * Math.PI / 180;

  const cosI = Math.cos(iRad);
  const sinI = Math.sin(iRad);
  const cosNode = Math.cos(longNodeRad);
  const sinNode = Math.sin(longNodeRad);

  const xEcliptic = (cosNode * Math.cos(v + argPeriRad) - sinNode * Math.sin(v + argPeriRad) * cosI) * r;
  const yEcliptic = (sinNode * Math.cos(v + argPeriRad) + cosNode * Math.sin(v + argPeriRad) * cosI) * r;
  const zEcliptic = Math.sin(v + argPeriRad) * sinI * r;

  const longitude = Math.atan2(yEcliptic, xEcliptic);
  const latitude = Math.atan2(zEcliptic, Math.sqrt(xEcliptic * xEcliptic + yEcliptic * yEcliptic));

  return { longitude, latitude, distance: r };
}

function earthHeliocentricPosition(jd: number) {
  const earthData: PlanetData = {
    name: 'Earth',
    elements: { a: 1.00000261, e: 0.01671123, i: -0.00001531, L: 100.46457166, longPeri: 102.93768193, longNode: 0.0 },
    rates: { a: 0.00000562, e: -0.00004392, i: -0.01294668, L: 35999.37244981, longPeri: 0.32327364, longNode: 0.0 },
    color: [0, 0, 0],
    apparentMagnitude: 0,
  };

  const pos = planetHeliocentricPosition(earthData, jd);

  return {
    x: pos.distance * Math.cos(pos.latitude) * Math.cos(pos.longitude),
    y: pos.distance * Math.cos(pos.latitude) * Math.sin(pos.longitude),
    z: pos.distance * Math.sin(pos.latitude),
  };
}

function eclipticToEquatorial(lon: number, lat: number, jd: number): { ra: number; dec: number } {
  const T = (jd - J2000) / 36525.0;
  const epsilon = (23.439291 - 0.0130042 * T) * Math.PI / 180;

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
 * Calculate geocentric equatorial coordinates for a planet
 * @param planetName Name of the planet
 * @param time Observation date/time (defaults to now)
 * @returns RA in hours (0-24), Dec in degrees (-90 to 90), distance in AU
 */
export function calculatePlanetPosition(planetName: string, time: Date = new Date()): { ra: number; dec: number; distance: number } | null {
  const planet = PLANET_DATA[planetName];
  if (!planet) {
    return null;
  }

  const jd = dateToJD(time);

  const planetPos = planetHeliocentricPosition(planet, jd);
  const earthPos = earthHeliocentricPosition(jd);

  const planetX = planetPos.distance * Math.cos(planetPos.latitude) * Math.cos(planetPos.longitude);
  const planetY = planetPos.distance * Math.cos(planetPos.latitude) * Math.sin(planetPos.longitude);
  const planetZ = planetPos.distance * Math.sin(planetPos.latitude);

  const geocentricX = planetX - earthPos.x;
  const geocentricY = planetY - earthPos.y;
  const geocentricZ = planetZ - earthPos.z;

  const geocentricDist = Math.sqrt(geocentricX * geocentricX + geocentricY * geocentricY + geocentricZ * geocentricZ);
  const geocentricLon = Math.atan2(geocentricY, geocentricX);
  const geocentricLat = Math.asin(geocentricZ / geocentricDist);

  const { ra, dec } = eclipticToEquatorial(geocentricLon, geocentricLat, jd);

  // Convert RA from radians to hours
  let raHours = ra * 12 / Math.PI;
  if (raHours < 0) raHours += 24;

  // Convert Dec from radians to degrees
  const decDegrees = dec * 180 / Math.PI;

  return {
    ra: raHours,
    dec: decDegrees,
    distance: geocentricDist,
  };
}

/**
 * Calculate Moon's position using ELP2000 truncated algorithm
 */
function calculateMoonPosition(time: Date = new Date()): { ra: number; dec: number; distance: number } {
  const jd = dateToJD(time);
  const T = (jd - J2000) / 36525.0;

  // Mean elements
  const Lp = normalizeAngle((218.3164477 + 481267.88123421 * T) * Math.PI / 180);
  const D = normalizeAngle((297.8501921 + 445267.1114034 * T) * Math.PI / 180);
  const M = normalizeAngle((357.5291092 + 35999.0502909 * T) * Math.PI / 180);
  const Mp = normalizeAngle((134.9633964 + 477198.8675055 * T) * Math.PI / 180);
  const F = normalizeAngle((93.2720950 + 483202.0175233 * T) * Math.PI / 180);

  // Longitude perturbation terms (most significant)
  const longitudeTerms = [
    [0, 0, 1, 0, 6288774],
    [2, 0, -1, 0, 1274027],
    [2, 0, 0, 0, 658314],
    [0, 0, 2, 0, 213618],
    [0, 1, 0, 0, -185116],
    [0, 0, 0, 2, -114332],
    [2, 0, -2, 0, 58793],
    [2, -1, -1, 0, 57066],
    [2, 0, 1, 0, 53322],
    [2, -1, 0, 0, 45758],
  ];

  let sumLong = 0;
  for (const [d, m, mp, f, coef] of longitudeTerms) {
    sumLong += coef * Math.sin(D * d + M * m + Mp * mp + F * f);
  }

  // Latitude perturbation terms
  const latitudeTerms = [
    [0, 0, 0, 1, 5128122],
    [0, 0, 1, 1, 280602],
    [0, 0, 1, -1, 277693],
    [2, 0, 0, -1, 173237],
    [2, 0, -1, 1, 55413],
    [2, 0, -1, -1, 46271],
    [2, 0, 0, 1, 32573],
  ];

  let sumLat = 0;
  for (const [d, m, mp, f, coef] of latitudeTerms) {
    sumLat += coef * Math.sin(D * d + M * m + Mp * mp + F * f);
  }

  // Distance perturbation terms
  const distanceTerms = [
    [0, 0, 1, 0, -20905355],
    [2, 0, -1, 0, -3699111],
    [2, 0, 0, 0, -2955968],
    [0, 0, 2, 0, -569925],
  ];

  let sumDist = 0;
  for (const [d, m, mp, f, coef] of distanceTerms) {
    sumDist += coef * Math.cos(D * d + M * m + Mp * mp + F * f);
  }

  // Calculate ecliptic coordinates
  const eclipticLon = Lp + sumLong / 1000000.0;
  const eclipticLat = sumLat / 1000000.0;
  const distanceKm = 385000.56 + sumDist / 1000.0;

  // Convert to equatorial coordinates
  const { ra, dec } = eclipticToEquatorial(eclipticLon, eclipticLat, jd);

  // Convert RA from radians to hours
  let raHours = ra * 12 / Math.PI;
  if (raHours < 0) raHours += 24;

  // Convert Dec from radians to degrees
  const decDegrees = dec * 180 / Math.PI;

  return {
    ra: raHours,
    dec: decDegrees,
    distance: distanceKm / 149597870.7, // Convert km to AU for consistency
  };
}

/**
 * Calculate Sun's position using simplified algorithm
 */
function calculateSunPosition(time: Date = new Date()): { ra: number; dec: number; distance: number } {
  const jd = dateToJD(time);
  const T = (jd - J2000) / 36525.0;

  // Mean longitude
  const L0 = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) * Math.PI / 180;

  // Mean anomaly
  const M_sun = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * Math.PI / 180;

  // Equation of center
  const C = ((1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M_sun)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M_sun)
    + 0.000289 * Math.sin(3 * M_sun)) * Math.PI / 180;

  // True longitude
  const sunLon = L0 + C;

  // Distance (AU)
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const distance = 1.000001018 * (1 - e * e) / (1 + e * Math.cos(M_sun + C));

  // Obliquity
  const epsilon = (23.439291 - 0.0130042 * T) * Math.PI / 180;

  // Convert to equatorial
  const ra = Math.atan2(Math.cos(epsilon) * Math.sin(sunLon), Math.cos(sunLon));
  const dec_rad = Math.asin(Math.sin(epsilon) * Math.sin(sunLon));

  // Convert RA from radians to hours
  let raHours = ra * 12 / Math.PI;
  if (raHours < 0) raHours += 24;

  // Convert Dec from radians to degrees
  const decDegrees = dec_rad * 180 / Math.PI;

  return {
    ra: raHours,
    dec: decDegrees,
    distance,
  };
}

function normalizeAngle(angle: number): number {
  while (angle < 0) angle += 2 * Math.PI;
  while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
  return angle;
}

/**
 * Calculate position of any solar system object (planet, Moon, or Sun)
 * @param name Name of the object ("Moon", "Sun", or planet name)
 * @param time Observation date/time (defaults to now)
 * @returns RA in hours (0-24), Dec in degrees (-90 to 90), distance in AU
 */
export function calculateSolarSystemPosition(name: string, time: Date = new Date()): { ra: number; dec: number; distance: number } | null {
  const normalizedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

  if (normalizedName === 'Moon') {
    return calculateMoonPosition(time);
  } else if (normalizedName === 'Sun') {
    return calculateSunPosition(time);
  } else if (normalizedName in PLANET_DATA) {
    return calculatePlanetPosition(normalizedName, time);
  }

  return null;
}

/**
 * Check if a target name is a solar system object (planet, Moon, or Sun)
 */
export function isSolarSystemObject(name: string): boolean {
  const normalizedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  return normalizedName === 'Moon' || normalizedName === 'Sun' || normalizedName in PLANET_DATA;
}

/**
 * Check if a target name is a planet (legacy, for backward compatibility)
 */
export function isPlanet(name: string): boolean {
  return isSolarSystemObject(name);
}

/**
 * Get list of all known solar system objects
 */
export function getSolarSystemObjectNames(): string[] {
  return ['Moon', 'Sun', ...Object.keys(PLANET_DATA)];
}

/**
 * Get list of all known planets
 */
export function getPlanetNames(): string[] {
  return Object.keys(PLANET_DATA);
}
