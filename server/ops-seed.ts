import { db } from "@db";
import {
  site,
  meteo,
  meteoQuality,
  horizon,
  obstacle,
  dewEvent,
  dewProfile,
  dewControlHint,
  lpTile,
  siteLp,
} from "../shared/ops-schema";
import { userSiteRegistry } from "../shared/planqa-schema";

export async function seedOpsData() {
  console.log("Seeding Operations & Environment data...");

  // ===== SITES =====
  // Create 3 demo sites
  const sites = await db
    .insert(site)
    .values([
      {
        name: "Mauna Kea Observatory",
        lat: 19.8207,
        lon: -155.4681,
        elevM: 4205,
        tz: "Pacific/Honolulu",
      },
      {
        name: "La Palma Observatory",
        lat: 28.7569,
        lon: -17.8856,
        elevM: 2396,
        tz: "Atlantic/Canary",
      },
      {
        name: "Mount Wilson Observatory",
        lat: 34.2242,
        lon: -118.0574,
        elevM: 1742,
        tz: "America/Los_Angeles",
      },
    ])
    .returning();

  console.log(`✓ Created ${sites.length} sites`);

  // ===== USER SITE REGISTRY =====
  // Seed planqa.site_profile with the same 3 sites
  const userSites = await db
    .insert(userSiteRegistry)
    .values([
      {
        name: "Mauna Kea Observatory",
        lat: 19.8207,
        lon: -155.4681,
        elevM: 4205,
        tz: "Pacific/Honolulu",
      },
      {
        name: "La Palma Observatory",
        lat: 28.7569,
        lon: -17.8856,
        elevM: 2396,
        tz: "Atlantic/Canary",
      },
      {
        name: "Mount Wilson Observatory",
        lat: 34.2242,
        lon: -118.0574,
        elevM: 1742,
        tz: "America/Los_Angeles",
      },
    ])
    .returning();

  console.log(`✓ Created ${userSites.length} user site registry entries`);

  // ===== WEATHER/METEO =====
  // Generate 24 hours of hourly meteo for one site only
  const now = new Date();
  const meteoData = [];
  const meteoSite = sites[0]; // Use first site
  
  for (let h = 0; h < 24; h++) {
    const ts = new Date(now.getTime() + h * 3600000);
    meteoData.push({
      siteId: meteoSite.id,
      ts,
      cloudPct: Math.random() * 40,
      transparencyIdx: 0.7 + Math.random() * 0.3,
      seeingArcsec: 1.2 + Math.random() * 1.5,
      windMps: Math.random() * 8,
      gustMps: Math.random() * 12,
      tempC: 10 + Math.random() * 10,
      dewpointC: 5 + Math.random() * 8,
      rhPct: 30 + Math.random() * 40,
      precipMm: Math.random() > 0.9 ? Math.random() * 2 : 0,
      pressureHpa: 1010 + Math.random() * 20,
      moonIllum: 0.35,
      moonAltDeg: -15 + h * 2,
      source: "simulated",
      modelRun: now,
    });
  }

  await db.insert(meteo).values(meteoData);
  console.log(`✓ Created ${meteoData.length} meteo forecasts (24h for one site)`);

  // ===== HORIZON =====
  const horizonPoints = [];
  for (const s of sites.slice(0, 2)) {
    // Generate horizon profile every 15 degrees
    for (let az = 0; az < 360; az += 15) {
      horizonPoints.push({
        siteId: s.id,
        azDeg: az,
        altLimitDeg: 10 + Math.random() * 15, // 10-25 degree horizon
        source: "synthetic",
      });
    }
  }

  await db.insert(horizon).values(horizonPoints);
  console.log(`✓ Created ${horizonPoints.length} horizon points`);

  // ===== OBSTACLES =====
  const obstacles = await db
    .insert(obstacle)
    .values([
      {
        siteId: sites[3].id, // Backyard observatory
        type: "tree",
        geomJson: {
          type: "Polygon",
          coordinates: [
            [
              [-104.991, 39.740],
              [-104.990, 39.740],
              [-104.990, 39.739],
              [-104.991, 39.739],
              [-104.991, 39.740],
            ],
          ],
        },
        note: "Large oak tree blocking NE view",
      },
      {
        siteId: sites[3].id,
        type: "building",
        geomJson: {
          type: "Polygon",
          coordinates: [
            [
              [-104.989, 39.740],
              [-104.988, 39.740],
              [-104.988, 39.738],
              [-104.989, 39.738],
              [-104.989, 39.740],
            ],
          ],
        },
        note: "Neighbor's house blocking S view below 20°",
      },
    ])
    .returning();

  console.log(`✓ Created ${obstacles.length} obstacles`);

  // ===== DEW RISK =====
  const dewEvents = [];
  for (const s of sites.slice(0, 2)) {
    for (let h = 0; h < 12; h++) {
      const ts = new Date(now.getTime() + h * 3600000);
      const tempC = 12 + Math.random() * 5;
      const dewpointC = tempC - (3 + Math.random() * 5);
      const marginC = tempC - dewpointC;
      
      let risk: 'low' | 'med' | 'high' = 'low';
      if (marginC < 2) risk = 'high';
      else if (marginC < 4) risk = 'med';

      dewEvents.push({
        siteId: s.id,
        ts,
        tempC,
        dewpointC,
        marginC,
        risk,
      });
    }
  }

  await db.insert(dewEvent).values(dewEvents);
  console.log(`✓ Created ${dewEvents.length} dew risk events`);

  // ===== DEW PROFILES =====
  const dewProfiles = await db
    .insert(dewProfile)
    .values([
      {
        deviceKey: "pegasus_upb_001",
        sensorLoc: "ota",
        tempC: 8.5,
        rhPct: 75.0,
        setpointPwm: 45,
      },
      {
        deviceKey: "pegasus_upb_001",
        sensorLoc: "ota",
        tempC: 5.2,
        rhPct: 82.0,
        setpointPwm: 65,
      },
      {
        deviceKey: "diy_heater_rpi",
        sensorLoc: "camera",
        tempC: 10.0,
        rhPct: 70.0,
        setpointPwm: 30,
      },
    ])
    .returning();

  console.log(`✓ Created ${dewProfiles.length} dew heater profiles`);

  // ===== DEW CONTROL HINTS =====
  const hints = await db
    .insert(dewControlHint)
    .values([
      {
        trainId: "d123e456-7890-4abc-9def-012345678901",
        ruleMd: "When **dew margin < 2°C** and **RH > 80%**, activate heater at **50% PWM** minimum.",
      },
      {
        trainId: "d123e456-7890-4abc-9def-012345678901",
        ruleMd: "For **camera sensors**, start heating when **margin < 4°C** to prevent condensation on cold glass.",
      },
    ])
    .returning();

  console.log(`✓ Created ${hints.length} dew control hints`);

  // ===== LIGHT POLLUTION TILES =====
  // Simulate tiles for zoom level 8 around Denver
  const lpTiles = [];
  const baseX = 52;
  const baseY = 98;
  
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      // Simulate gradient: darker tiles further from city center
      const distance = Math.sqrt(dx * dx + dy * dy);
      const mpsas = 18.5 + distance * 0.8; // SQM 18.5-21.1

      lpTiles.push({
        z: 8,
        x: baseX + dx,
        y: baseY + dy,
        mpsas,
        dataset: "world_atlas_2015",
      });
    }
  }

  await db.insert(lpTile).values(lpTiles);
  console.log(`✓ Created ${lpTiles.length} light pollution tiles`);

  // ===== SITE LP =====
  // Create additional sites for LP data (7 more to reach 10 total LP points)
  const additionalSites = await db
    .insert(site)
    .values([
      {
        name: "Kitt Peak Observatory",
        lat: 31.9583,
        lon: -111.5967,
        elevM: 2096,
        tz: "America/Phoenix",
      },
      {
        name: "Cerro Paranal",
        lat: -24.6272,
        lon: -70.4042,
        elevM: 2635,
        tz: "America/Santiago",
      },
      {
        name: "Siding Spring Observatory",
        lat: -31.2728,
        lon: 149.0661,
        elevM: 1165,
        tz: "Australia/Sydney",
      },
      {
        name: "Palomar Observatory",
        lat: 33.3564,
        lon: -116.8647,
        elevM: 1712,
        tz: "America/Los_Angeles",
      },
      {
        name: "Lick Observatory",
        lat: 37.3414,
        lon: -121.6431,
        elevM: 1283,
        tz: "America/Los_Angeles",
      },
      {
        name: "McDonald Observatory",
        lat: 30.6714,
        lon: -104.0214,
        elevM: 2070,
        tz: "America/Chicago",
      },
      {
        name: "Apache Point Observatory",
        lat: 32.7803,
        lon: -105.8203,
        elevM: 2788,
        tz: "America/Denver",
      },
    ])
    .returning();

  // Create 10 demo LP points (3 from main sites + 7 from additional sites)
  const allSitesForLp = [...sites, ...additionalSites];
  const siteLpData = await db
    .insert(siteLp)
    .values(
      allSitesForLp.slice(0, 10).map((s, idx) => ({
        siteId: s.id,
        mpsasEst: idx < 3 
          ? [21.9, 21.5, 20.2][idx] // Use fixed values for first 3
          : 18.5 + Math.random() * 3.5, // Random between 18.5-22.0 for others
        method: "interpolated_tiles",
      }))
    )
    .returning();

  console.log(`✓ Created ${siteLpData.length} site light pollution estimates`);

  console.log("✅ Operations & Environment seed complete!");
}
