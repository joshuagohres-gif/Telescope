import type { TLE } from "@shared/astrodb-schema";
import * as satellite from "satellite.js";

// Satellite pass prediction service using SGP4 orbit propagation

export interface SatellitePass {
  riseTime: string;
  riseAz: number;
  maxTime: string;
  maxAlt: number;
  maxAz: number;
  maxMag: number | null;
  setTime: string;
  setAz: number;
  durationSec: number;
}

/**
 * Minimum elevation angle (degrees) to consider satellite above horizon
 */
const MIN_ELEVATION = 0.0;

/**
 * Time step for propagation sampling (milliseconds)
 */
const TIME_STEP_MS = 60000; // 1 minute

/**
 * Calculate Sun position for illumination checking
 * Returns ecliptic coordinates of the Sun
 */
function getSunPosition(date: Date): { x: number; y: number; z: number } {
  const jd = satellite.jday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );

  // Days since J2000.0
  const T = (jd - 2451545.0) / 36525.0;

  // Mean longitude of Sun (degrees)
  const L0 = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360;

  // Mean anomaly (degrees)
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360;
  const MRad = M * (Math.PI / 180);

  // Equation of center
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(MRad) +
            (0.019993 - 0.000101 * T) * Math.sin(2 * MRad) +
            0.000289 * Math.sin(3 * MRad);

  // True longitude (degrees)
  const sunLon = (L0 + C) * (Math.PI / 180);

  // Distance to Sun (AU)
  const R = 1.000001018 * (1 - 0.01671123 * Math.cos(MRad));

  // Convert to ECI coordinates (km)
  const AU_TO_KM = 149597870.7;
  return {
    x: R * AU_TO_KM * Math.cos(sunLon),
    y: R * AU_TO_KM * Math.sin(sunLon),
    z: 0, // Simplified: ignore ecliptic latitude
  };
}

/**
 * Check if satellite is illuminated by the Sun
 */
function isSatelliteIlluminated(
  satPos: { x: number; y: number; z: number },
  date: Date
): boolean {
  const sunPos = getSunPosition(date);

  // Vector from Earth to satellite
  const satDist = Math.sqrt(satPos.x ** 2 + satPos.y ** 2 + satPos.z ** 2);

  // Vector from satellite to Sun
  const satToSun = {
    x: sunPos.x - satPos.x,
    y: sunPos.y - satPos.y,
    z: sunPos.z - satPos.z,
  };

  // Dot product: if negative, satellite is in Earth's shadow
  const dotProduct = satPos.x * satToSun.x + satPos.y * satToSun.y + satPos.z * satToSun.z;

  // Additional check: satellite must be far enough from Earth's shadow cone
  const EARTH_RADIUS_KM = 6371;

  // If satellite is on the night side and within shadow cone, it's eclipsed
  if (dotProduct < 0) {
    // Distance from Earth-Sun line
    const crossX = satPos.y * satToSun.z - satPos.z * satToSun.y;
    const crossY = satPos.z * satToSun.x - satPos.x * satToSun.z;
    const crossZ = satPos.x * satToSun.y - satPos.y * satToSun.x;
    const crossMag = Math.sqrt(crossX ** 2 + crossY ** 2 + crossZ ** 2);
    const distFromSunLine = crossMag / Math.sqrt(satToSun.x ** 2 + satToSun.y ** 2 + satToSun.z ** 2);

    if (distFromSunLine < EARTH_RADIUS_KM && satDist < 42000) {
      return false; // In shadow
    }
  }

  return true; // Illuminated
}

/**
 * Compute satellite passes visible from observer location
 */
export async function computeSatellitePasses(
  tle: TLE,
  latitude: number,
  longitude: number,
  altitude: number,
  fromDate: Date,
  toDate: Date
): Promise<SatellitePass[]> {
  try {
    // Parse TLE
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);

    if (!satrec) {
      console.error(`Failed to parse TLE for satellite ${tle.noradId}`);
      return [];
    }

    // Observer location in geodetic coordinates
    const observerGd = {
      latitude: satellite.degreesToRadians(latitude),
      longitude: satellite.degreesToRadians(longitude),
      height: altitude / 1000, // meters to km
    };

    const passes: SatellitePass[] = [];
    let currentTime = new Date(fromDate);

    // Track state for pass detection
    let inPass = false;
    let passStartTime: Date | null = null;
    let passStartAz = 0;
    let maxElevation = 0;
    let maxElevationTime: Date | null = null;
    let maxElevationAz = 0;
    let passEndTime: Date | null = null;
    let passEndAz = 0;
    let wasIlluminated = false;

    // Sample satellite position at regular intervals
    while (currentTime <= toDate) {
      // Propagate satellite position
      const positionAndVelocity = satellite.propagate(satrec, currentTime);

      if (typeof positionAndVelocity.position === 'boolean') {
        // Propagation error
        currentTime = new Date(currentTime.getTime() + TIME_STEP_MS);
        continue;
      }

      const positionEci = positionAndVelocity.position as satellite.EciVec3<number>;

      // Convert observer location to ECI
      const gmst = satellite.gstime(currentTime);
      const observerEcf = satellite.geodeticToEcf(observerGd);
      const observerEci = satellite.ecfToEci(observerEcf, gmst);

      // Calculate look angles from observer to satellite
      const lookAngles = satellite.ecfToLookAngles(observerGd,
        satellite.eciToEcf(positionEci, gmst));

      const elevationDeg = lookAngles.elevation * (180 / Math.PI);
      const azimuthDeg = lookAngles.azimuth * (180 / Math.PI);
      const isAboveHorizon = elevationDeg >= MIN_ELEVATION;
      const isIlluminated = isSatelliteIlluminated(positionEci, currentTime);

      // Pass detection state machine
      if (!inPass && isAboveHorizon) {
        // Pass starting
        inPass = true;
        passStartTime = new Date(currentTime);
        passStartAz = azimuthDeg;
        maxElevation = elevationDeg;
        maxElevationTime = new Date(currentTime);
        maxElevationAz = azimuthDeg;
        wasIlluminated = isIlluminated;
      } else if (inPass && isAboveHorizon) {
        // Pass continuing - track max elevation
        if (elevationDeg > maxElevation) {
          maxElevation = elevationDeg;
          maxElevationTime = new Date(currentTime);
          maxElevationAz = azimuthDeg;
        }
        wasIlluminated = wasIlluminated || isIlluminated;
      } else if (inPass && !isAboveHorizon) {
        // Pass ending
        passEndTime = new Date(currentTime);
        passEndAz = azimuthDeg;

        if (passStartTime && maxElevationTime && passEndTime) {
          const durationSec = (passEndTime.getTime() - passStartTime.getTime()) / 1000;

          // Estimate magnitude based on max elevation and illumination
          // Brighter satellites at higher elevations: rough approximation
          let maxMag: number | null = null;
          if (wasIlluminated) {
            // Typical range: -8 (very bright ISS) to +5 (faint)
            // Higher elevation = brighter
            maxMag = 2.0 - (maxElevation / 15); // Rough approximation
          }

          passes.push({
            riseTime: passStartTime.toISOString(),
            riseAz: passStartAz,
            maxTime: maxElevationTime.toISOString(),
            maxAlt: maxElevation,
            maxAz: maxElevationAz,
            maxMag,
            setTime: passEndTime.toISOString(),
            setAz: passEndAz,
            durationSec,
          });
        }

        // Reset for next pass
        inPass = false;
        passStartTime = null;
        passStartAz = 0;
        maxElevation = 0;
        maxElevationTime = null;
        maxElevationAz = 0;
        passEndTime = null;
        passEndAz = 0;
        wasIlluminated = false;
      }

      // Advance time
      currentTime = new Date(currentTime.getTime() + TIME_STEP_MS);
    }

    // Handle case where pass extends beyond toDate
    if (inPass && passStartTime && maxElevationTime) {
      const durationSec = (toDate.getTime() - passStartTime.getTime()) / 1000;

      // Estimate magnitude
      let maxMag: number | null = null;
      if (wasIlluminated) {
        maxMag = 2.0 - (maxElevation / 15);
      }

      passes.push({
        riseTime: passStartTime.toISOString(),
        riseAz: passStartAz,
        maxTime: maxElevationTime.toISOString(),
        maxAlt: maxElevation,
        maxAz: maxElevationAz,
        maxMag,
        setTime: toDate.toISOString(),
        setAz: maxElevationAz, // Use max az as approximation for incomplete pass
        durationSec,
      });
    }

    console.log(`[SatellitePasses] Computed ${passes.length} passes for satellite ${tle.noradId} from ${fromDate.toISOString()} to ${toDate.toISOString()}`);

    return passes;

  } catch (error) {
    console.error(`Error computing satellite passes:`, error);
    return [];
  }
}

/**
 * Get current satellite position in real-time
 * Returns look angles (azimuth, elevation, range) from observer
 */
export function getSatellitePosition(
  tle: TLE,
  latitude: number,
  longitude: number,
  altitude: number,
  time: Date = new Date()
): {
  azimuth: number;
  elevation: number;
  range: number;
  illuminated: boolean;
} | null {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);

    if (!satrec) {
      return null;
    }

    const positionAndVelocity = satellite.propagate(satrec, time);

    if (typeof positionAndVelocity.position === 'boolean') {
      return null;
    }

    const positionEci = positionAndVelocity.position as satellite.EciVec3<number>;

    const observerGd = {
      latitude: satellite.degreesToRadians(latitude),
      longitude: satellite.degreesToRadians(longitude),
      height: altitude / 1000,
    };

    const gmst = satellite.gstime(time);
    const lookAngles = satellite.ecfToLookAngles(observerGd,
      satellite.eciToEcf(positionEci, gmst));

    return {
      azimuth: satellite.degreesLong(lookAngles.azimuth),
      elevation: satellite.degreesLat(lookAngles.elevation),
      range: lookAngles.rangeSat,
      illuminated: isSatelliteIlluminated(positionEci, time),
    };

  } catch (error) {
    console.error(`Error getting satellite position:`, error);
    return null;
  }
}
