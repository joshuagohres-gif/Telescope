/**
 * Planetary position calculations using simplified Keplerian orbital elements
 * Based on JPL low-precision formulas (good to ~1 arcminute for dates 1800-2050)
 *
 * References:
 * - JPL Keplerian Elements for Approximate Positions of the Major Planets
 * - Meeus, Astronomical Algorithms (2nd ed.)
 */

import { dateToJD } from './sidereal';

/**
 * Keplerian orbital elements at epoch
 */
interface OrbitalElements {
  a: number;      // Semi-major axis (AU)
  e: number;      // Eccentricity
  i: number;      // Inclination (degrees)
  L: number;      // Mean longitude (degrees)
  longPeri: number; // Longitude of perihelion (degrees)
  longNode: number; // Longitude of ascending node (degrees)
}

/**
 * Rates of change for orbital elements (per century)
 */
interface ElementRates {
  a: number;
  e: number;
  i: number;
  L: number;
  longPeri: number;
  longNode: number;
}

/**
 * Planet orbital data structure
 */
interface PlanetData {
  name: string;
  elements: OrbitalElements;
  rates: ElementRates;
  color: [number, number, number]; // RGB
  apparentMagnitude: number; // Approximate visual magnitude
  diameter: number; // Equatorial diameter in kilometers
}

const J2000 = 2451545.0; // Julian Date for J2000.0 epoch

/**
 * Orbital elements and rates for major planets (J2000.0 epoch)
 * Source: JPL Solar System Dynamics
 */
export const PLANET_DATA: Record<string, PlanetData> = {
  Mercury: {
    name: 'Mercury',
    elements: { a: 0.38709927, e: 0.20563593, i: 7.00497902, L: 252.25032350, longPeri: 77.45779628, longNode: 48.33076593 },
    rates: { a: 0.00000037, e: 0.00001906, i: -0.00594749, L: 149472.67411175, longPeri: 0.16047689, longNode: -0.12534081 },
    color: [0.7, 0.7, 0.7],
    apparentMagnitude: -0.5,
    diameter: 4880, // km
  },
  Venus: {
    name: 'Venus',
    elements: { a: 0.72333566, e: 0.00677672, i: 3.39467605, L: 181.97909950, longPeri: 131.60246718, longNode: 76.67984255 },
    rates: { a: 0.00000390, e: -0.00004107, i: -0.00078890, L: 58517.81538729, longPeri: 0.00268329, longNode: -0.27769418 },
    color: [0.9, 0.9, 0.7],
    apparentMagnitude: -4.0,
    diameter: 12104, // km
  },
  Mars: {
    name: 'Mars',
    elements: { a: 1.52371034, e: 0.09339410, i: 1.84969142, L: -4.55343205, longPeri: -23.94362959, longNode: 49.55953891 },
    rates: { a: 0.00001847, e: 0.00007882, i: -0.00813131, L: 19140.30268499, longPeri: 0.44441088, longNode: -0.29257343 },
    color: [1.0, 0.5, 0.3],
    apparentMagnitude: -1.0,
    diameter: 6779, // km
  },
  Jupiter: {
    name: 'Jupiter',
    elements: { a: 5.20288700, e: 0.04838624, i: 1.30439695, L: 34.39644051, longPeri: 14.72847983, longNode: 100.47390909 },
    rates: { a: -0.00011607, e: -0.00013253, i: -0.00183714, L: 3034.74612775, longPeri: 0.21252668, longNode: 0.20469106 },
    color: [0.9, 0.8, 0.6],
    apparentMagnitude: -2.5,
    diameter: 139820, // km
  },
  Saturn: {
    name: 'Saturn',
    elements: { a: 9.53667594, e: 0.05386179, i: 2.48599187, L: 49.95424423, longPeri: 92.59887831, longNode: 113.66242448 },
    rates: { a: -0.00125060, e: -0.00050991, i: 0.00193609, L: 1222.49362201, longPeri: -0.41897216, longNode: -0.28867794 },
    color: [0.9, 0.85, 0.6],
    apparentMagnitude: 0.5,
    diameter: 116460, // km (excluding rings)
  },
  Uranus: {
    name: 'Uranus',
    elements: { a: 19.18916464, e: 0.04725744, i: 0.77263783, L: 313.23810451, longPeri: 170.95427630, longNode: 74.01692503 },
    rates: { a: -0.00196176, e: -0.00004397, i: -0.00242939, L: 428.48202785, longPeri: 0.40805281, longNode: 0.04240589 },
    color: [0.6, 0.8, 0.9],
    apparentMagnitude: 5.5,
    diameter: 50724, // km
  },
  Neptune: {
    name: 'Neptune',
    elements: { a: 30.06992276, e: 0.00859048, i: 1.77004347, L: -55.12002969, longPeri: 44.96476227, longNode: 131.78422574 },
    rates: { a: 0.00026291, e: 0.00005105, i: 0.00035372, L: 218.45945325, longPeri: -0.32241464, longNode: -0.00508664 },
    color: [0.4, 0.5, 0.9],
    apparentMagnitude: 7.8,
    diameter: 49244, // km
  },
};

/**
 * Ecliptic coordinates (heliocentric)
 */
export interface EclipticCoordinates {
  longitude: number; // radians
  latitude: number;  // radians
  distance: number;  // AU
}

/**
 * Equatorial coordinates (geocentric)
 */
export interface EquatorialCoordinates {
  ra: number;   // Right Ascension in radians
  dec: number;  // Declination in radians
  distance: number; // AU from Earth
}

/**
 * Calculate orbital elements for a given Julian Date
 */
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

/**
 * Solve Kepler's equation for eccentric anomaly
 * Uses iterative Newton-Raphson method
 */
function solveKepler(M: number, e: number, tolerance: number = 1e-6): number {
  // M = mean anomaly, e = eccentricity
  // Solve: E - e*sin(E) = M for E (eccentric anomaly)

  let E = M; // Initial guess

  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;

    if (Math.abs(dE) < tolerance) {
      break;
    }
  }

  return E;
}

/**
 * Calculate heliocentric ecliptic coordinates for a planet
 */
function planetHeliocentricPosition(planet: PlanetData, jd: number): EclipticCoordinates {
  const elem = computeElements(planet, jd);

  // Argument of perihelion
  const argPeri = elem.longPeri - elem.longNode;

  // Mean anomaly
  let M = elem.L - elem.longPeri;
  M = ((M + 180) % 360 - 180) * Math.PI / 180; // Normalize to [-π, π]

  // Solve Kepler's equation for eccentric anomaly
  const E = solveKepler(M, elem.e);

  // True anomaly
  const v = 2 * Math.atan2(
    Math.sqrt(1 + elem.e) * Math.sin(E / 2),
    Math.sqrt(1 - elem.e) * Math.cos(E / 2)
  );

  // Distance from Sun
  const r = elem.a * (1 - elem.e * Math.cos(E));

  // Convert angles to radians
  const iRad = elem.i * Math.PI / 180;
  const argPeriRad = argPeri * Math.PI / 180;
  const longNodeRad = elem.longNode * Math.PI / 180;

  // Heliocentric coordinates in orbital plane
  const xOrbital = r * Math.cos(v + argPeriRad);
  const yOrbital = r * Math.sin(v + argPeriRad);

  // Transform to ecliptic coordinates
  const cosI = Math.cos(iRad);
  const sinI = Math.sin(iRad);
  const cosNode = Math.cos(longNodeRad);
  const sinNode = Math.sin(longNodeRad);

  const xEcliptic = (cosNode * Math.cos(v + argPeriRad) - sinNode * Math.sin(v + argPeriRad) * cosI) * r;
  const yEcliptic = (sinNode * Math.cos(v + argPeriRad) + cosNode * Math.sin(v + argPeriRad) * cosI) * r;
  const zEcliptic = Math.sin(v + argPeriRad) * sinI * r;

  // Convert to ecliptic longitude and latitude
  const longitude = Math.atan2(yEcliptic, xEcliptic);
  const latitude = Math.atan2(zEcliptic, Math.sqrt(xEcliptic * xEcliptic + yEcliptic * yEcliptic));

  return {
    longitude,
    latitude,
    distance: r,
  };
}

/**
 * Calculate Earth's heliocentric position (needed for geocentric conversion)
 */
function earthHeliocentricPosition(jd: number): { x: number; y: number; z: number } {
  // Use Earth's orbital elements (Earth-Moon barycenter approximation)
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

/**
 * Convert ecliptic coordinates to equatorial coordinates
 * Applies obliquity of the ecliptic transformation
 */
function eclipticToEquatorial(lon: number, lat: number, jd: number): { ra: number; dec: number } {
  // Obliquity of the ecliptic (J2000.0 + corrections)
  const T = (jd - J2000) / 36525.0;
  const epsilon = (23.439291 - 0.0130042 * T) * Math.PI / 180; // radians

  const cosEps = Math.cos(epsilon);
  const sinEps = Math.sin(epsilon);
  const cosLat = Math.cos(lat);
  const sinLat = Math.sin(lat);
  const cosLon = Math.cos(lon);
  const sinLon = Math.sin(lon);

  // Transform to equatorial
  const x = cosLat * cosLon;
  const y = cosLat * sinLon * cosEps - sinLat * sinEps;
  const z = cosLat * sinLon * sinEps + sinLat * cosEps;

  const ra = Math.atan2(y, x);
  const dec = Math.asin(z);

  return { ra, dec };
}

/**
 * Calculate geocentric equatorial coordinates for a planet
 * @param planetName Name of the planet (Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune)
 * @param time Observation date/time
 * @returns RA/Dec in radians and distance in AU from Earth
 */
export function calculatePlanetPosition(planetName: string, time: Date): EquatorialCoordinates | null {
  const planet = PLANET_DATA[planetName];
  if (!planet) {
    console.error(`Unknown planet: ${planetName}`);
    return null;
  }

  const jd = dateToJD(time);

  // Get heliocentric positions
  const planetPos = planetHeliocentricPosition(planet, jd);
  const earthPos = earthHeliocentricPosition(jd);

  // Convert to Cartesian for geocentric transformation
  const planetX = planetPos.distance * Math.cos(planetPos.latitude) * Math.cos(planetPos.longitude);
  const planetY = planetPos.distance * Math.cos(planetPos.latitude) * Math.sin(planetPos.longitude);
  const planetZ = planetPos.distance * Math.sin(planetPos.latitude);

  // Geocentric Cartesian coordinates
  const geocentricX = planetX - earthPos.x;
  const geocentricY = planetY - earthPos.y;
  const geocentricZ = planetZ - earthPos.z;

  // Convert back to ecliptic
  const geocentricDist = Math.sqrt(geocentricX * geocentricX + geocentricY * geocentricY + geocentricZ * geocentricZ);
  const geocentricLon = Math.atan2(geocentricY, geocentricX);
  const geocentricLat = Math.asin(geocentricZ / geocentricDist);

  // Convert to equatorial coordinates
  const { ra, dec } = eclipticToEquatorial(geocentricLon, geocentricLat, jd);

  return {
    ra,
    dec,
    distance: geocentricDist,
  };
}

/**
 * Get all visible planets with their positions
 * @param time Observation date/time
 * @returns Array of planet data with calculated positions
 */
export function getAllPlanetPositions(time: Date): Array<{
  name: string;
  ra: number;
  dec: number;
  distance: number;
  color: [number, number, number];
  magnitude: number;
  diameter: number;
}> {
  const results = [];

  for (const [name, planet] of Object.entries(PLANET_DATA)) {
    const pos = calculatePlanetPosition(name, time);
    if (pos) {
      results.push({
        name,
        ra: pos.ra,
        dec: pos.dec,
        distance: pos.distance,
        color: planet.color,
        magnitude: planet.apparentMagnitude,
        diameter: planet.diameter,
      });
    }
  }

  return results;
}
