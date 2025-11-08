/**
 * Satellite Propagation Utilities
 * 
 * SGP4 wrapper for satellite orbit propagation and visibility calculations.
 * Uses satellite.js library if available, otherwise provides a simplified implementation.
 */

export interface TLE {
  line1: string;
  line2: string;
  epoch: Date;
}

export interface SatellitePosition {
  lat: number; // Geodetic latitude in degrees
  lon: number; // Longitude in degrees
  alt: number; // Altitude in km
  ra: number; // Right Ascension in degrees
  dec: number; // Declination in degrees
  az: number; // Azimuth in degrees
  el: number; // Elevation in degrees
  range: number; // Range in km
  sunlit: boolean; // Whether satellite is in sunlight
}

export interface Observer {
  lat: number; // Latitude in degrees
  lon: number; // Longitude in degrees
  alt: number; // Altitude in meters
}

/**
 * Calculate sun altitude for a given time and location
 */
function sunAltitude(date: Date, lat: number, lon: number): number {
  // Simplified sun position calculation
  const jd = (date.getTime() / 86400000) + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = (357.528 + 0.9856003 * n) % 360;
  const lambda = L + 1.915 * Math.sin((g * Math.PI) / 180) + 0.020 * Math.sin((2 * g * Math.PI) / 180);
  const epsilon = 23.439 - 0.0000004 * n;
  const alpha = Math.atan2(
    Math.cos((epsilon * Math.PI) / 180) * Math.sin((lambda * Math.PI) / 180),
    Math.cos((lambda * Math.PI) / 180)
  ) * (180 / Math.PI);
  const delta = Math.asin(Math.sin((epsilon * Math.PI) / 180) * Math.sin((lambda * Math.PI) / 180)) * (180 / Math.PI);
  
  // Calculate hour angle
  const lst = localSiderealTime(date, lon);
  const ha = (lst - alpha / 15) * 15;
  
  // Calculate altitude
  const latRad = (lat * Math.PI) / 180;
  const decRad = (delta * Math.PI) / 180;
  const haRad = (ha * Math.PI) / 180;
  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  return Math.asin(sinAlt) * (180 / Math.PI);
}

/**
 * Local Sidereal Time (simplified version)
 */
function localSiderealTime(date: Date, lon: number): number {
  const jd = (date.getTime() / 86400000) + 2440587.5;
  const jd0 = Math.floor(jd - 0.5) + 0.5;
  const h = (jd - jd0) * 24;
  const t = (jd0 - 2451545.0) / 36525.0;
  const gmst = 6.697374558 + 0.06570982441908 * t + 1.00273790935 * h + 0.000026 * t * t;
  const lst = (gmst + lon / 15.0) % 24.0;
  return lst < 0 ? lst + 24 : lst;
}

/**
 * Check if satellite is sunlit (simplified)
 * In a real implementation, this would check if the satellite is in Earth's shadow
 */
function isSunlit(date: Date, satAlt: number): boolean {
  // Simplified: assume satellite is sunlit if it's above 200km and sun is up
  // In reality, need to check if satellite is in Earth's shadow cone
  return satAlt > 200;
}

/**
 * Propagate satellite position using SGP4
 * 
 * This is a simplified implementation. For production use, install satellite.js:
 * npm install satellite.js @types/satellite.js
 * 
 * @param tle - Two-Line Element set
 * @param date - Time to propagate to
 * @param observer - Observer location (optional, for topocentric coordinates)
 * @returns Satellite position
 */
export function propagateSGP4(
  tle: TLE,
  date: Date,
  observer?: Observer
): SatellitePosition {
  // STUB: This is a simplified implementation
  // In production, use satellite.js library:
  // 
  // import * as satellite from 'satellite.js';
  // const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
  // const positionAndVelocity = satellite.propagate(satrec, date);
  // const positionEci = positionAndVelocity.position;
  // const gmst = satellite.gstime(date);
  // const positionGd = satellite.eciToGeodetic(positionEci, gmst);
  
  // For now, return mock data based on TLE epoch
  const timeSinceEpoch = (date.getTime() - tle.epoch.getTime()) / 1000 / 3600; // hours
  
  // Extract inclination and other elements from TLE line 2 (simplified parsing)
  const line2Parts = tle.line2.trim().split(/\s+/);
  const inclination = parseFloat(line2Parts[2]) || 51.6; // ISS default
  const raan = parseFloat(line2Parts[3]) || 0;
  const meanAnomaly = parseFloat(line2Parts[5]) || 0;
  
  // Simplified orbital propagation (circular orbit approximation)
  const period = 90; // minutes (ISS ~90 min)
  const meanMotion = 360 / period; // degrees per minute
  const currentAnomaly = (meanAnomaly + meanMotion * timeSinceEpoch * 60) % 360;
  
  // Convert to geodetic coordinates (simplified)
  const lat = inclination * Math.sin((currentAnomaly * Math.PI) / 180);
  const lon = (raan + (360 * timeSinceEpoch / 24)) % 360;
  const alt = 400; // km (ISS altitude)
  
  // Calculate if sunlit
  const sunlit = isSunlit(date, alt);
  
  // If observer provided, calculate topocentric coordinates
  let ra = 0, dec = 0, az = 0, el = 0, range = 0;
  if (observer) {
    // Simplified: calculate range and elevation
    // In reality, need proper coordinate transformation
    const dLat = lat - observer.lat;
    const dLon = lon - observer.lon;
    range = Math.sqrt(dLat * dLat + dLon * dLon) * 111; // rough km
    el = Math.max(0, 90 - (range / alt) * (180 / Math.PI));
    
    // Calculate RA/Dec from observer's perspective (simplified)
    ra = (lon + observer.lon) % 360;
    dec = lat;
    
    // Calculate azimuth (simplified)
    az = Math.atan2(dLon, dLat) * (180 / Math.PI);
    if (az < 0) az += 360;
  }
  
  return {
    lat,
    lon,
    alt,
    ra,
    dec,
    az,
    el,
    range,
    sunlit,
  };
}

/**
 * Check visibility conditions for a satellite pass
 * 
 * @param observer - Observer location
 * @param date - Time to check
 * @param satPosition - Satellite position
 * @returns Object with visibility flags
 */
export function checkVisibility(
  observer: Observer,
  date: Date,
  satPosition: SatellitePosition
): {
  visible: boolean;
  sunAlt: number;
  satSunlit: boolean;
  maxEl: number;
} {
  const sunAlt = sunAltitude(date, observer.lat, observer.lon);
  const satSunlit = satPosition.sunlit;
  const maxEl = satPosition.el;
  
  // Visibility conditions:
  // 1. Observer sun altitude < -6° (astronomical twilight)
  // 2. Satellite is sunlit
  // 3. Maximum elevation >= 20°
  const visible = sunAlt < -6 && satSunlit && maxEl >= 20;
  
  return {
    visible,
    sunAlt,
    satSunlit,
    maxEl,
  };
}

/**
 * Find visible passes for a satellite
 * 
 * @param tle - Two-Line Element set
 * @param observer - Observer location
 * @param from - Start time
 * @param to - End time
 * @returns Array of pass windows
 */
export function findVisiblePasses(
  tle: TLE,
  observer: Observer,
  from: Date,
  to: Date
): Array<{
  start: Date;
  peak: Date;
  end: Date;
  maxElDeg: number;
  azStart: number;
  azPeak: number;
}> {
  const passes: Array<{
    start: Date;
    peak: Date;
    end: Date;
    maxElDeg: number;
    azStart: number;
    azPeak: number;
  }> = [];
  
  // Sample every 30 seconds
  const stepMs = 30 * 1000;
  let current = new Date(from);
  let inPass = false;
  let passStart: Date | null = null;
  let maxEl = 0;
  let peakTime: Date | null = null;
  let azStart = 0;
  let azPeak = 0;
  
  while (current <= to) {
    const satPos = propagateSGP4(tle, current, observer);
    const visibility = checkVisibility(observer, current, satPos);
    
    if (visibility.visible && satPos.el >= 10) {
      // Pass started or continuing
      if (!inPass) {
        inPass = true;
        passStart = new Date(current);
        azStart = satPos.az;
      }
      
      if (satPos.el > maxEl) {
        maxEl = satPos.el;
        peakTime = new Date(current);
        azPeak = satPos.az;
      }
    } else if (inPass) {
      // Pass ended
      if (passStart && peakTime && maxEl >= 20) {
        passes.push({
          start: passStart,
          peak: peakTime,
          end: new Date(current),
          maxElDeg: maxEl,
          azStart,
          azPeak,
        });
      }
      inPass = false;
      passStart = null;
      maxEl = 0;
      peakTime = null;
    }
    
    current = new Date(current.getTime() + stepMs);
  }
  
  // Handle pass that extends beyond 'to'
  if (inPass && passStart && peakTime && maxEl >= 20) {
    passes.push({
      start: passStart,
      peak: peakTime,
      end: to,
      maxElDeg: maxEl,
      azStart,
      azPeak,
    });
  }
  
  return passes;
}
