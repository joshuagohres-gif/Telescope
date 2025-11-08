#!/usr/bin/env tsx
/**
 * Seed ISS TLE
 * 
 * Imports ISS TLE data from text file into satobs.satellite and satobs.tle tables.
 */

import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { satellite, tle } from "../shared/astrodb-schema";
import ws from "ws";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  webSocketConstructor: ws as any 
});
const db = drizzle(pool);

const ISS_NORAD_ID = 25544;

function parseTLE(filePath: string): { name: string; line1: string; line2: string; epoch: Date } {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length < 3) {
    throw new Error("TLE file must have at least 3 lines (name, line1, line2)");
  }

  const name = lines[0];
  const line1 = lines[1];
  const line2 = lines[2];

  // Parse epoch from line1 (characters 18-32: YYDDD.DDDDDDDD)
  const epochStr = line1.substring(18, 32).trim();
  const year = parseInt(epochStr.substring(0, 2));
  const dayOfYear = parseFloat(epochStr.substring(2));
  
  // Convert to Date (simplified - assumes 2000s)
  const fullYear = year < 50 ? 2000 + year : 1900 + year;
  const date = new Date(fullYear, 0, 1);
  date.setDate(date.getDate() + Math.floor(dayOfYear) - 1);
  const hours = (dayOfYear - Math.floor(dayOfYear)) * 24;
  date.setHours(date.getHours() + Math.floor(hours));
  date.setMinutes(date.getMinutes() + Math.floor((hours - Math.floor(hours)) * 60));

  return { name, line1, line2, epoch: date };
}

async function seedISSTLE() {
  console.log("Seeding ISS TLE data...");

  const filePath = process.argv[2] || "server/seed/iss_tle.txt";
  const tleData = parseTLE(filePath);

  console.log(`Parsed TLE for ${tleData.name}`);
  console.log(`Epoch: ${tleData.epoch.toISOString()}`);

  // Insert or update satellite record
  await db.insert(satellite).values({
    noradId: ISS_NORAD_ID,
    name: tleData.name,
    category: "station",
    visualMagEst: -1.0, // ISS can be very bright
  }).onConflictDoUpdate({
    target: [satellite.noradId],
    set: {
      name: tleData.name,
    },
  });

  console.log(`✓ Created/updated satellite record for NORAD ${ISS_NORAD_ID}`);

  // Insert TLE
  await db.insert(tle).values({
    noradId: ISS_NORAD_ID,
    line1: tleData.line1,
    line2: tleData.line2,
    epoch: tleData.epoch,
    source: "seed_file",
  }).onConflictDoUpdate({
    target: [tle.noradId, tle.epoch],
    set: {
      line1: tleData.line1,
      line2: tleData.line2,
    },
  });

  console.log(`✓ Created/updated TLE record`);
  console.log("✅ ISS TLE seed complete");
  await pool.end();
}

seedISSTLE().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
