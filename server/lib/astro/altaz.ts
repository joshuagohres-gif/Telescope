/**
 * Altitude/Azimuth Conversion Utilities
 * 
 * Converts RA/Dec to Alt/Az for a given observer location and time.
 * Includes Local Sidereal Time (LST) calculation.
 */

/**
 * Convert hours, minutes, seconds to decimal degrees
 */
function hmsToDeg(h: number, m: number, s: number): number {
  return (h + m / 60 + s / 3600) * 15;
}

/**
 * Convert degrees, arcminutes, arcseconds to decimal degrees
 */
function dmsToDeg(d: number, m: number, s: number): number {
  const sign = d >= 0 ? 1 : -1;
  return sign * (Math.abs(d) + m / 60 + s / 3600);
}

/**
 * Calculate Julian Day from Date
 */
function julianDay(date: Date): number {
  const time = date.getTime();
  return time / 86400000 + 2440587.5;
}

/**
 * Calculate Local Sidereal Time (LST) in hours
 * 
 * @param date - UTC date/time
 * @param lon - Observer longitude in degrees (positive = east)
 * @returns LST in hours (0-24)
 */
export function localSiderealTime(date: Date, lon: number): number {
  const jd = julianDay(date);
  const jd0 = Math.floor(jd - 0.5) + 0.5;
  const h = (jd - jd0) * 24;
  
  const t = (jd0 - 2451545.0) / 36525.0;
  
  // Greenwich Mean Sidereal Time (GMST) in hours
  const gmst = 6.697374558 + 0.06570982441908 * t + 1.00273790935 * h + 0.000026 * t * t;
  
  // Local Sidereal Time
  const lst = (gmst + lon / 15.0) % 24.0;
  return lst < 0 ? lst + 24 : lst;
}

/**
 * Convert RA/Dec to Hour Angle
 * 
 * @param ra - Right Ascension in degrees
 * @param lst - Local Sidereal Time in hours
 * @returns Hour Angle in degrees
 */
function raToHourAngle(ra: number, lst: number): number {
  const raHours = ra / 15.0;
  let ha = (lst - raHours) * 15.0;
  
  // Normalize to -180 to +180
  while (ha > 180) ha -= 360;
  while (ha < -180) ha += 360;
  
  return ha;
}

/**
 * Convert RA/Dec to Alt/Az
 * 
 * @param ra - Right Ascension in degrees (J2000)
 * @param dec - Declination in degrees (J2000)
 * @param lat - Observer latitude in degrees
 * @param lon - Observer longitude in degrees (positive = east)
 * @param date - UTC date/time
 * @returns Object with alt (altitude) and az (azimuth) in degrees
 */
export function raDecToAltAz(
  ra: number,
  dec: number,
  lat: number,
  lon: number,
  date: Date
): { alt: number; az: number } {
  const lst = localSiderealTime(date, lon);
  const ha = raToHourAngle(ra, lst);
  
  // Convert to radians
  const latRad = (lat * Math.PI) / 180;
  const decRad = (dec * Math.PI) / 180;
  const haRad = (ha * Math.PI) / 180;
  
  // Calculate altitude
  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + 
                 Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const alt = Math.asin(sinAlt) * (180 / Math.PI);
  
  // Calculate azimuth
  const cosAz = (Math.sin(decRad) - Math.sin(latRad) * Math.sin(alt * Math.PI / 180)) /
                (Math.cos(latRad) * Math.cos(alt * Math.PI / 180));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) * (180 / Math.PI);
  
  // Adjust azimuth based on hour angle
  if (Math.sin(haRad) > 0) {
    az = 360 - az;
  }
  
  return { alt, az };
}

/**
 * Calculate hourly alt/az positions for a time window
 * 
 * @param ra - Right Ascension in degrees
 * @param dec - Declination in degrees
 * @param lat - Observer latitude in degrees
 * @param lon - Observer longitude in degrees
 * @param from - Start time (UTC)
 * @param to - End time (UTC)
 * @param stepMinutes - Step size in minutes (default: 60)
 * @returns Array of {time, alt, az} objects
 */
export function hourlyAltAz(
  ra: number,
  dec: number,
  lat: number,
  lon: number,
  from: Date,
  to: Date,
  stepMinutes: number = 60
): Array<{ time: Date; alt: number; az: number }> {
  const results: Array<{ time: Date; alt: number; az: number }> = [];
  const stepMs = stepMinutes * 60 * 1000;
  
  let current = new Date(from);
  while (current <= to) {
    const { alt, az } = raDecToAltAz(ra, dec, lat, lon, current);
    results.push({ time: new Date(current), alt, az });
    current = new Date(current.getTime() + stepMs);
  }
  
  return results;
}

/**
 * Find peak altitude for a time window
 * 
 * @param ra - Right Ascension in degrees
 * @param dec - Declination in degrees
 * @param lat - Observer latitude in degrees
 * @param lon - Observer longitude in degrees
 * @param from - Start time (UTC)
 * @param to - End time (UTC)
 * @returns Peak altitude in degrees and the time it occurs
 */
export function peakAltitude(
  ra: number,
  dec: number,
  lat: number,
  lon: number,
  from: Date,
  to: Date
): { peakAlt: number; peakTime: Date } {
  const hourly = hourlyAltAz(ra, dec, lat, lon, from, to, 15); // 15-minute steps for accuracy
  
  let maxAlt = -90;
  let peakTime = from;
  
  for (const point of hourly) {
    if (point.alt > maxAlt) {
      maxAlt = point.alt;
      peakTime = point.time;
    }
  }
  
  return { peakAlt: maxAlt, peakTime };
}
