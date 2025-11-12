import { opsStorage } from "./ops-storage";

/**
 * Weather Data Integration Service
 *
 * Fetches weather forecasts from external APIs and stores them in the database.
 * Supports multiple weather providers for astronomical observing conditions.
 */

// ===== 7TIMER ASTRO INTEGRATION =====
// Free astronomical seeing/transparency forecast
// API Docs: http://www.7timer.info/doc.php?lang=en

interface SevenTimerDataPoint {
  timepoint: number; // hours from init time
  cloudcover: number; // 1-9 (oktas)
  seeing: number; // 1-8 (1=<0.5", 8=>4")
  transparency: number; // 1-8 (1=<0.3, 8>1)
  lifted_index: number;
  rh2m: number; // relative humidity %
  wind10m: { direction: string; speed: number }; // speed in m/s
  temp2m: number; // temp in Celsius
  prec_type: string; // precipitation type
}

interface SevenTimerResponse {
  product: string;
  init: string; // YYYYMMDDHH format
  dataseries: SevenTimerDataPoint[];
}

interface OpenMeteoDataPoint {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  dew_point_2m: number;
  precipitation: number;
  cloud_cover: number;
  wind_speed_10m: number;
  wind_gusts_10m: number;
}

interface OpenMeteoResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    dew_point_2m: number[];
    precipitation: number[];
    cloud_cover: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
  };
}

export class WeatherIntegration {

  /**
   * Fetch and store 7Timer astronomical forecast for a site
   */
  async fetch7TimerAstro(siteId: string, lat: number, lon: number): Promise<number> {
    try {
      const site = await opsStorage.getSiteById(siteId);
      if (!site) {
        throw new Error(`Site ${siteId} not found`);
      }

      // 7Timer API endpoint
      const url = `http://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=astro&output=json`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`7Timer API returned ${response.status}`);
      }

      const data: SevenTimerResponse = await response.json();

      // Parse init time (format: YYYYMMDDHH)
      const initStr = data.init;
      const initDate = new Date(
        parseInt(initStr.substring(0, 4)), // year
        parseInt(initStr.substring(4, 6)) - 1, // month (0-indexed)
        parseInt(initStr.substring(6, 8)), // day
        parseInt(initStr.substring(8, 10)), // hour
        0,
        0
      );

      let insertCount = 0;

      // Process each forecast point
      for (const point of data.dataseries) {
        const forecastTime = new Date(initDate.getTime() + point.timepoint * 3600 * 1000);

        // Convert 7Timer scales to our format
        // Cloud cover: 1-9 oktas -> 0-100%
        const cloudPct = (point.cloudcover / 9) * 100;

        // Transparency: 1-8 -> 0-10 index (higher is better)
        const transparencyIdx = point.transparency * 1.25;

        // Seeing: 1-8 -> arcseconds (1=excellent <0.5", 8=terrible >4")
        const seeingMap = [0.4, 0.6, 0.9, 1.2, 1.7, 2.5, 3.5, 5.0];
        const seeingArcsec = seeingMap[point.seeing - 1] || 2.0;

        // Convert wind direction string to degrees
        const windDirMap: Record<string, number> = {
          N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
        };
        const windDirDeg = windDirMap[point.wind10m.direction] || 0;

        // Estimate dewpoint from temp and RH using Magnus formula
        const tempC = point.temp2m;
        const rhPct = point.rh2m;
        const dewpointC = this.calculateDewpoint(tempC, rhPct);

        // Calculate moon phase for this time (simplified - in production, use proper ephemeris)
        const moonData = this.simpleMoonPhase(forecastTime);

        await opsStorage.upsertMeteo({
          siteId,
          ts: forecastTime,
          source: "7timer_astro",
          cloudPct,
          transparencyIdx,
          seeingArcsec,
          windMps: point.wind10m.speed,
          windDirDeg,
          gustMps: null,
          tempC,
          dewpointC,
          rhPct,
          precipMm: null,
          pressureHpa: null,
          moonIllum: moonData.illumination,
          moonAltDeg: 0, // Would need proper calculation
        });

        insertCount++;
      }

      console.log(`✓ Fetched ${insertCount} forecast points from 7Timer for site ${siteId}`);
      return insertCount;

    } catch (error) {
      console.error(`✗ Error fetching 7Timer data for site ${siteId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch and store Open-Meteo forecast for a site
   * Open-Meteo is free and provides good general weather data
   */
  async fetchOpenMeteo(siteId: string, lat: number, lon: number): Promise<number> {
    try {
      const site = await opsStorage.getSiteById(siteId);
      if (!site) {
        throw new Error(`Site ${siteId} not found`);
      }

      // Open-Meteo API endpoint (free, no API key required)
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        hourly: [
          "temperature_2m",
          "relative_humidity_2m",
          "dew_point_2m",
          "precipitation",
          "cloud_cover",
          "wind_speed_10m",
          "wind_gusts_10m",
        ].join(","),
        forecast_days: "3",
      });

      const url = `https://api.open-meteo.com/v1/forecast?${params}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Open-Meteo API returned ${response.status}`);
      }

      const data: OpenMeteoResponse = await response.json();

      let insertCount = 0;

      // Process each hourly forecast point
      for (let i = 0; i < data.hourly.time.length; i++) {
        const forecastTime = new Date(data.hourly.time[i]);

        const tempC = data.hourly.temperature_2m[i];
        const rhPct = data.hourly.relative_humidity_2m[i];
        const dewpointC = data.hourly.dew_point_2m[i];
        const cloudPct = data.hourly.cloud_cover[i];
        const windMps = data.hourly.wind_speed_10m[i];
        const gustMps = data.hourly.wind_gusts_10m[i];
        const precipMm = data.hourly.precipitation[i];

        // Calculate moon phase
        const moonData = this.simpleMoonPhase(forecastTime);

        await opsStorage.upsertMeteo({
          siteId,
          ts: forecastTime,
          source: "open_meteo",
          cloudPct,
          transparencyIdx: null, // Open-Meteo doesn't provide this
          seeingArcsec: null, // Open-Meteo doesn't provide this
          windMps,
          windDirDeg: null,
          gustMps,
          tempC,
          dewpointC,
          rhPct,
          precipMm,
          pressureHpa: null,
          moonIllum: moonData.illumination,
          moonAltDeg: 0, // Would need proper calculation
        });

        insertCount++;
      }

      console.log(`✓ Fetched ${insertCount} forecast points from Open-Meteo for site ${siteId}`);
      return insertCount;

    } catch (error) {
      console.error(`✗ Error fetching Open-Meteo data for site ${siteId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch combined forecast: Open-Meteo for general weather + 7Timer for astro conditions
   */
  async fetchCombinedForecast(siteId: string, lat: number, lon: number): Promise<void> {
    console.log(`\nFetching combined forecast for site ${siteId}...`);

    try {
      // Fetch from both sources in parallel
      const [openMeteoCount, sevenTimerCount] = await Promise.all([
        this.fetchOpenMeteo(siteId, lat, lon).catch(() => 0),
        this.fetch7TimerAstro(siteId, lat, lon).catch(() => 0),
      ]);

      console.log(`\n✓ Combined fetch complete: ${openMeteoCount} Open-Meteo + ${sevenTimerCount} 7Timer points\n`);
    } catch (error) {
      console.error(`✗ Error in combined forecast fetch:`, error);
      throw error;
    }
  }

  /**
   * Update forecasts for all sites in the database
   */
  async updateAllSites(): Promise<void> {
    console.log("\n========== WEATHER UPDATE JOB STARTED ==========\n");

    try {
      const sites = await opsStorage.getSites({});

      if (sites.length === 0) {
        console.log("No sites found to update");
        return;
      }

      console.log(`Found ${sites.length} sites to update\n`);

      for (const site of sites) {
        try {
          await this.fetchCombinedForecast(site.id, site.lat, site.lon);
          // Add delay between requests to be polite to APIs
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Failed to update site ${site.name}:`, error);
          // Continue with other sites even if one fails
        }
      }

      console.log("\n========== WEATHER UPDATE JOB COMPLETED ==========\n");
    } catch (error) {
      console.error("Error in updateAllSites:", error);
      throw error;
    }
  }

  /**
   * Calculate dewpoint from temperature and relative humidity using Magnus formula
   */
  private calculateDewpoint(tempC: number, rhPct: number): number {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * tempC) / (b + tempC)) + Math.log(rhPct / 100);
    const dewpoint = (b * alpha) / (a - alpha);
    return dewpoint;
  }

  /**
   * Simple moon phase calculation
   * Returns illumination fraction (0-1) and phase name
   *
   * This is a simplified calculation. For production, use a proper astronomical library.
   */
  private simpleMoonPhase(date: Date): { illumination: number; phase: string } {
    // Known new moon: January 6, 2000, 18:14 UTC
    const knownNewMoon = new Date(2000, 0, 6, 18, 14, 0).getTime();
    const lunarCycle = 29.530588853; // days

    const daysSinceNew = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
    const phase = daysSinceNew % lunarCycle;

    // Calculate illumination (0-1)
    let illumination: number;
    if (phase < lunarCycle / 2) {
      // Waxing
      illumination = phase / (lunarCycle / 2);
    } else {
      // Waning
      illumination = 1 - ((phase - lunarCycle / 2) / (lunarCycle / 2));
    }

    // Determine phase name
    let phaseName: string;
    if (phase < 1) phaseName = "New Moon";
    else if (phase < lunarCycle / 4 - 1) phaseName = "Waxing Crescent";
    else if (phase < lunarCycle / 4 + 1) phaseName = "First Quarter";
    else if (phase < lunarCycle / 2 - 1) phaseName = "Waxing Gibbous";
    else if (phase < lunarCycle / 2 + 1) phaseName = "Full Moon";
    else if (phase < 3 * lunarCycle / 4 - 1) phaseName = "Waning Gibbous";
    else if (phase < 3 * lunarCycle / 4 + 1) phaseName = "Last Quarter";
    else phaseName = "Waning Crescent";

    return {
      illumination: Math.round(illumination * 100) / 100,
      phase: phaseName,
    };
  }
}

// Singleton instance
export const weatherIntegration = new WeatherIntegration();
