#!/usr/bin/env tsx
/**
 * Master seed script for all AstroDB domains
 * Runs all seed functions in sequence
 */

import { seedAstroDbData } from "./astrodb-seed";
import { seedDesignData } from "./design-seed";
import { seedOpsData } from "./ops-seed";
import { seedCalibData } from "./calib-seed";
import { seedTargetsData } from "./targets-seed";
import { seedPlanQaData } from "./planqa-seed";

async function seedAll() {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║  AstroDB Master Seed Script               ║");
  console.log("╚═══════════════════════════════════════════╝");
  console.log("");

  try {
    // Original AstroDB domains
    console.log("📦 Seeding Equipment, Catalog, Satellites, Events...");
    await seedAstroDbData();
    console.log("");

    // Design KB
    console.log("📐 Seeding Telescope Design Knowledge Base...");
    await seedDesignData();
    console.log("");

    // Operations & Environment
    console.log("🌤️  Seeding Operations & Environment...");
    await seedOpsData();
    console.log("");

    // Calibration
    console.log("🔧 Seeding Equipment & Calibration...");
    await seedCalibData();
    console.log("");

    // Targets & Alerts
    console.log("🎯 Seeding Targeting & Alerts...");
    await seedTargetsData();
    console.log("");

    // Planning, QA & Personalization
    console.log("📊 Seeding Planning, QA & Personalization...");
    await seedPlanQaData();
    console.log("");

    console.log("╔═══════════════════════════════════════════╗");
    console.log("║  ✅ All domains seeded successfully!      ║");
    console.log("╚═══════════════════════════════════════════╝");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedAll();
