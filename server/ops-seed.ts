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

export async function seedOpsData() {
  console.log("Seeding Operations & Environment data...");

  // ===== SITES =====
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
      {
        name: "Backyard Observatory - Denver",
        lat: 39.7392,
        lon: -104.9903,
        elevM: 1609,
        tz: "America/Denver",
      },
    ])
    .returning();

  console.log(`✓ Created ${sites.length} sites`);

  // ===== WEATHER/METEO =====
  const now = new Date();
  const meteoData = [];
  
  for (const s of sites.slice(0, 2)) {
    // Generate 24 hours of forecast for first 2 sites
    for (let h = 0; h < 24; h++) {
      const ts = new Date(now.getTime() + h * 3600000);
      meteoData.push({
        siteId: s.id,
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
  }

  await db.insert(meteo).values(meteoData);
  console.log(`✓ Created ${meteoData.length} meteo forecasts`);

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
  const siteLpData = await db
    .insert(siteLp)
    .values([
      {
        siteId: sites[0].id, // Mauna Kea
        mpsasEst: 21.9,
        method: "interpolated_tiles",
      },
      {
        siteId: sites[1].id, // La Palma
        mpsasEst: 21.5,
        method: "interpolated_tiles",
      },
      {
        siteId: sites[2].id, // Mount Wilson
        mpsasEst: 20.2,
        method: "interpolated_tiles",
      },
      {
        siteId: sites[3].id, // Denver backyard
        mpsasEst: 19.1,
        method: "interpolated_tiles",
      },
    ])
    .returning();

  console.log(`✓ Created ${siteLpData.length} site light pollution estimates`);

  console.log("✅ Operations & Environment seed complete!");
}
