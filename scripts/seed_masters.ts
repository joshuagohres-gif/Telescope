#!/usr/bin/env tsx
/**
 * Seed Master Frames
 * 
 * Imports master calibration frames from JSON into the database.
 */

import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { masterFrame } from "../shared/calib-schema";
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

interface MasterFrameData {
  train_id: string;
  kind: 'dark' | 'bias' | 'flat' | 'darkflat';
  filter?: string;
  sensor_temp_c?: number;
  gain?: string;
  exposure_s?: number;
  hash: string;
  s3_url: string;
}

async function seedMasters() {
  console.log("Seeding master frames...");

  const filePath = process.argv[2] || "server/seed/masters_index.json";
  const content = readFileSync(filePath, "utf-8");
  const masters: MasterFrameData[] = JSON.parse(content);

  console.log(`Found ${masters.length} master frames to import`);

  for (const master of masters) {
    try {
      await db.insert(masterFrame).values({
        trainId: master.train_id,
        kind: master.kind,
        filter: master.filter,
        sensorTempC: master.sensor_temp_c,
        gain: master.gain,
        exposureS: master.exposure_s,
        hash: master.hash,
        s3Url: master.s3_url,
        frameCount: 20, // Default frame count
        capturedAt: new Date(),
      }).onConflictDoUpdate({
        target: [masterFrame.hash],
        set: {
          sensorTempC: master.sensor_temp_c,
          gain: master.gain,
          exposureS: master.exposure_s,
          s3Url: master.s3_url,
        },
      });
      console.log(`✓ Imported master frame: ${master.kind} ${master.filter || 'N/A'} ${master.sensor_temp_c}°C`);
    } catch (error: any) {
      console.error(`Error importing master frame:`, error.message);
    }
  }

  console.log(`✅ Imported ${masters.length} master frames`);
  await pool.end();
}

seedMasters().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
