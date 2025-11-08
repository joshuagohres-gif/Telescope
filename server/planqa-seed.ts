import { db } from "@db";
import {
  recipe,
  snrModel,
  session,
  submetric,
  siteProfile,
  userSetting,
} from "../shared/planqa-schema";

export async function seedPlanQaData() {
  console.log("Seeding Planning, QA & Personalization data...");

  // ===== RECIPES =====
  const recipes = await db
    .insert(recipe)
    .values([
      {
        name: "Deep Sky LRGB - Standard",
        targetType: "dso",
        filterName: "L",
        exposureSec: 300.0,
        frameCount: 40,
        totalExpMin: 200.0,
        binning: "1x1",
        gain: 100,
        offset: 50,
        temp_c: -10.0,
        ditherPx: 5,
        notes: "Standard deep-sky recipe for luminance, 40x 5min",
        createdBy: "admin",
      },
      {
        name: "Deep Sky LRGB - Red",
        targetType: "dso",
        filterName: "R",
        exposureSec: 180.0,
        frameCount: 20,
        totalExpMin: 60.0,
        binning: "1x1",
        gain: 100,
        offset: 50,
        temp_c: -10.0,
        ditherPx: 5,
        notes: "Red channel for LRGB, 20x 3min",
        createdBy: "admin",
      },
      {
        name: "Ha Narrowband - Extended",
        targetType: "dso",
        filterName: "Ha",
        exposureSec: 600.0,
        frameCount: 30,
        totalExpMin: 300.0,
        binning: "1x1",
        gain: 100,
        offset: 50,
        temp_c: -10.0,
        ditherPx: 3,
        notes: "Deep Ha for emission nebulae, 30x 10min",
        createdBy: "admin",
      },
      {
        name: "Lunar Mosaic - Single Panel",
        targetType: "lunar",
        filterName: "L",
        exposureSec: 0.005,
        frameCount: 1000,
        totalExpMin: 0.083,
        binning: "1x1",
        gain: 100,
        offset: 50,
        notes: "High-speed lunar imaging, 1000 frames per panel",
        createdBy: "admin",
      },
      {
        name: "Planetary - RGB",
        targetType: "planetary",
        filterName: "R",
        exposureSec: 0.01,
        frameCount: 2000,
        totalExpMin: 0.33,
        binning: "1x1",
        gain: 200,
        offset: 50,
        notes: "High-speed planetary, 2000 frames per RGB channel",
        createdBy: "admin",
      },
    ])
    .returning();

  console.log(`✓ Created ${recipes.length} exposure recipes`);

  // ===== SNR MODELS =====
  const trainId = "12345678-1234-1234-1234-123456789abc";
  
  const snrModels = await db
    .insert(snrModel)
    .values([
      {
        trainId,
        filterName: "L",
        targetType: "dso",
        skyMpsas: 21.0,
        coeffsJson: { a: 12.5, b: 0.08, c: -2.0 },
        validRange: { min_exp: 60, max_exp: 900 },
        r2: 0.94,
        sampleCount: 45,
      },
      {
        trainId,
        filterName: "Ha",
        targetType: "dso",
        skyMpsas: 21.0,
        coeffsJson: { a: 8.2, b: 0.05, c: -1.5 },
        validRange: { min_exp: 120, max_exp: 1200 },
        r2: 0.91,
        sampleCount: 32,
      },
      {
        trainId,
        filterName: "R",
        targetType: "dso",
        skyMpsas: 21.0,
        coeffsJson: { a: 10.8, b: 0.07, c: -1.8 },
        validRange: { min_exp: 60, max_exp: 600 },
        r2: 0.93,
        sampleCount: 38,
      },
    ])
    .returning();

  console.log(`✓ Created ${snrModels.length} SNR models`);

  // ===== SESSIONS =====
  const siteId = "98765432-9876-9876-9876-987654321abc";
  const now = new Date();

  const sessions = await db
    .insert(session)
    .values([
      {
        trainId,
        siteId,
        startedAt: new Date(now.getTime() - 7 * 86400000),
        endedAt: new Date(now.getTime() - 7 * 86400000 + 4 * 3600000),
        targetName: "M42 - Orion Nebula",
        filterName: "Ha",
        frameCount: 25,
        totalExpSec: 15000.0,
        notes: "Excellent seeing, low wind",
      },
      {
        trainId,
        siteId,
        startedAt: new Date(now.getTime() - 5 * 86400000),
        endedAt: new Date(now.getTime() - 5 * 86400000 + 3 * 3600000),
        targetName: "M31 - Andromeda Galaxy",
        filterName: "L",
        frameCount: 18,
        totalExpSec: 10800.0,
        notes: "Some clouds, aborted early",
      },
      {
        trainId,
        siteId,
        startedAt: new Date(now.getTime() - 2 * 86400000),
        endedAt: new Date(now.getTime() - 2 * 86400000 + 5 * 3600000),
        targetName: "NGC 2244 - Rosette Nebula",
        filterName: "Ha",
        frameCount: 30,
        totalExpSec: 18000.0,
        notes: "Perfect conditions, full moon phase",
      },
    ])
    .returning();

  console.log(`✓ Created ${sessions.length} imaging sessions`);

  // ===== SUBMETRICS =====
  const submetrics = [];

  for (const sess of sessions) {
    // Generate synthetic metrics for each session
    const sessionStart = sess.startedAt;
    const frameCount = sess.frameCount;
    
    for (let i = 0; i < frameCount; i++) {
      const ts = new Date(sessionStart.getTime() + i * 600000); // Every 10 min
      
      // HFR (seeing)
      submetrics.push({
        sessionId: sess.id,
        metricName: "hfr",
        value: 2.0 + Math.random() * 0.8,
        unit: "arcsec",
        ts,
      });
      
      // Guide RMS
      submetrics.push({
        sessionId: sess.id,
        metricName: "guide_rms",
        value: 0.4 + Math.random() * 0.3,
        unit: "arcsec",
        ts,
      });
      
      // Sky background
      submetrics.push({
        sessionId: sess.id,
        metricName: "sky_adu",
        value: 800 + Math.random() * 200,
        unit: "ADU",
        ts,
      });
      
      // Number of stars
      submetrics.push({
        sessionId: sess.id,
        metricName: "star_count",
        value: 120 + Math.floor(Math.random() * 50),
        unit: "stars",
        ts,
      });
    }
  }

  await db.insert(submetric).values(submetrics);
  console.log(`✓ Created ${submetrics.length} session sub-metrics`);

  // ===== SITE PROFILES =====
  const siteProfiles = await db
    .insert(siteProfile)
    .values([
      {
        userId: "user_001",
        siteId,
        label: "Home Observatory",
        isPrimary: 1,
        prefsJson: {
          auto_focus_interval_min: 30,
          auto_dither_interval: 3,
          guide_settle_sec: 5,
          max_session_duration_min: 360,
        },
      },
      {
        userId: "user_001",
        siteId: "11111111-1111-1111-1111-111111111111",
        label: "Dark Sky Site",
        isPrimary: 0,
        prefsJson: {
          auto_focus_interval_min: 60,
          auto_dither_interval: 5,
          guide_settle_sec: 10,
          max_session_duration_min: 480,
        },
      },
    ])
    .returning();

  console.log(`✓ Created ${siteProfiles.length} site profiles`);

  // ===== USER SETTINGS =====
  const userSettings = await db
    .insert(userSetting)
    .values([
      {
        userId: "user_001",
        settingsJson: {
          ui_theme: "dark",
          default_exposure_sec: 300,
          default_gain: 100,
          default_offset: 50,
          notifications: {
            session_start: true,
            session_end: true,
            qa_alert: true,
          },
        },
      },
    ])
    .returning();

  console.log(`✓ Created ${userSettings.length} user settings`);

  console.log("✅ Planning, QA & Personalization seed complete!");
}
