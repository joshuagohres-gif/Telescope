/**
 * Equatorial to Horizontal coordinate conversion
 * Converts RA/Dec to Alt/Az for an observer at a given location and time
 */

import { calculateLST } from './sidereal';
import { applyRefraction } from './refraction';

export interface HorizontalCoordinates {
  altitude: number;  // radians
  azimuth: number;   // radians (0 = North, π/2 = East, π = South, 3π/2 = West)
}

/**
 * Convert equatorial coordinates (RA/Dec) to horizontal (Alt/Az)
 * @param ra Right Ascension in radians
 * @param dec Declination in radians
 * @param time Observer's local time
 * @param latitudeDeg Observer's latitude in degrees (positive North)
 * @param longitudeDeg Observer's longitude in degrees (positive East)
 * @param applyAtmRefraction Whether to apply atmospheric refraction (default true)
 * @returns {altitude, azimuth} in radians
 */
export function equatorialToHorizontal(
  ra: number,
  dec: number,
  time: Date,
  latitudeDeg: number,
  longitudeDeg: number,
  applyAtmRefraction: boolean = true
): HorizontalCoordinates {
  // Calculate Local Sidereal Time
  const lst = calculateLST(time, longitudeDeg);

  // Calculate Hour Angle
  let ha = lst - ra;

  // Normalize HA to [-π, π]
  while (ha > Math.PI) ha -= 2 * Math.PI;
  while (ha < -Math.PI) ha += 2 * Math.PI;

  // Convert latitude to radians
  const lat = latitudeDeg * Math.PI / 180;

  // Calculate altitude
  const sinAlt = Math.sin(dec) * Math.sin(lat) +
                 Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  let altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  // Calculate azimuth
  const cosAz = (Math.sin(dec) - Math.sin(altitude) * Math.sin(lat)) /
                (Math.cos(altitude) * Math.cos(lat));
  const sinAz = -Math.sin(ha) * Math.cos(dec) / Math.cos(altitude);

  let azimuth = Math.atan2(sinAz, cosAz);
  if (azimuth < 0) azimuth += 2 * Math.PI;

  // Apply atmospheric refraction if requested
  if (applyAtmRefraction && altitude > -Math.PI / 180) {
    const altitudeDeg = altitude * 180 / Math.PI;
    const refractedAltDeg = applyRefraction(altitudeDeg);
    altitude = refractedAltDeg * Math.PI / 180;
  }

  return { altitude, azimuth };
}

/**
 * Convert horizontal coordinates (Alt/Az) to a direction vector
 * @param altitude Altitude in radians
 * @param azimuth Azimuth in radians (0 = North)
 * @returns {x, y, z} unit direction vector
 */
export function horizontalToDirection(altitude: number, azimuth: number): { x: number; y: number; z: number } {
  // Convert to Cartesian coordinates
  // x = East, y = Up, z = North
  const cosAlt = Math.cos(altitude);
  const sinAlt = Math.sin(altitude);
  const cosAz = Math.cos(azimuth);
  const sinAz = Math.sin(azimuth);

  return {
    x: cosAlt * sinAz,      // East component
    y: sinAlt,              // Up component
    z: cosAlt * cosAz       // North component
  };
}

/**
 * Complete transform: RA/Dec to 3D direction vector
 * @param ra Right Ascension in radians
 * @param dec Declination in radians
 * @param time Observer's local time
 * @param latitudeDeg Observer's latitude in degrees
 * @param longitudeDeg Observer's longitude in degrees
 * @param applyAtmRefraction Whether to apply refraction
 * @returns {x, y, z} unit direction vector, or null if below horizon
 */
export function starToDirection(
  ra: number,
  dec: number,
  time: Date,
  latitudeDeg: number,
  longitudeDeg: number,
  applyAtmRefraction: boolean = true
): { x: number; y: number; z: number } | null {
  const { altitude, azimuth } = equatorialToHorizontal(
    ra,
    dec,
    time,
    latitudeDeg,
    longitudeDeg,
    applyAtmRefraction
  );

  // Return null if below horizon
  if (altitude < 0) {
    return null;
  }

  return horizontalToDirection(altitude, azimuth);
}
