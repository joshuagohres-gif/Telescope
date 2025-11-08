#!/usr/bin/env tsx
/**
 * Fit Focus Profile
 * 
 * Reads focus samples from CSV, fits a V-curve model, and writes focus_profile.
 */

import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { focusSample, focusProfile } from "../shared/calib-schema";
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

interface FocusSampleData {
  train_id: string;
  ts: string;
  filter: string;
  temp_c: number;
  position: number;
  hfr: number;
  exposure_s: number;
}

/**
 * Fit a V-curve (quadratic) to focus samples
 * Model: hfr = a * (position - b)^2 + c
 * Where b is the optimal position
 */
function fitVCurve(samples: Array<{ position: number; hfr: number }>): {
  model: { a: number; b: number; c: number; type: 'vcurve' };
  r2: number;
  optimalPos: number;
} {
  if (samples.length < 3) {
    throw new Error("Need at least 3 samples for V-curve fit");
  }

  // Find minimum HFR (optimal position)
  let minHfr = samples[0].hfr;
  let optimalPos = samples[0].position;
  for (const s of samples) {
    if (s.hfr < minHfr) {
      minHfr = s.hfr;
      optimalPos = s.position;
    }
  }

  // Fit quadratic: hfr = a * (pos - optimalPos)^2 + c
  // Using least squares
  let sumX2 = 0, sumX4 = 0, sumY = 0, sumXY = 0;
  for (const s of samples) {
    const x = s.position - optimalPos;
    const x2 = x * x;
    const x4 = x2 * x2;
    sumX2 += x2;
    sumX4 += x4;
    sumY += s.hfr;
    sumXY += s.hfr * x2;
  }

  const n = samples.length;
  const a = (n * sumXY - sumX2 * sumY) / (n * sumX4 - sumX2 * sumX2);
  const c = (sumY - a * sumX4) / n;

  // Calculate R²
  let ssRes = 0, ssTot = 0;
  const meanHfr = sumY / n;
  for (const s of samples) {
    const x = s.position - optimalPos;
    const predicted = a * x * x + c;
    ssRes += Math.pow(s.hfr - predicted, 2);
    ssTot += Math.pow(s.hfr - meanHfr, 2);
  }
  const r2 = 1 - (ssRes / ssTot);

  return {
    model: {
      a: Math.max(a, 0.0001), // Ensure positive
      b: optimalPos,
      c: Math.max(c, 0),
      type: 'vcurve',
    },
    r2: Math.max(0, Math.min(1, r2)), // Clamp to [0, 1]
    optimalPos: Math.round(optimalPos),
  };
}

function parseCSV(filePath: string): FocusSampleData[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  
  if (lines.length < 2) {
    throw new Error("CSV file must have at least a header and one data row");
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const trainIdIdx = header.indexOf("train_id");
  const tsIdx = header.indexOf("ts");
  const filterIdx = header.indexOf("filter");
  const tempCIdx = header.indexOf("temp_c");
  const positionIdx = header.indexOf("position");
  const hfrIdx = header.indexOf("hfr");
  const exposureSIdx = header.indexOf("exposure_s");

  if (trainIdIdx === -1 || tsIdx === -1 || filterIdx === -1 || tempCIdx === -1 || 
      positionIdx === -1 || hfrIdx === -1) {
    throw new Error("CSV must have required columns: train_id, ts, filter, temp_c, position, hfr");
  }

  const samples: FocusSampleData[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length > Math.max(trainIdIdx, tsIdx, filterIdx, tempCIdx, positionIdx, hfrIdx)) {
      samples.push({
        train_id: values[trainIdIdx],
        ts: values[tsIdx],
        filter: values[filterIdx],
        temp_c: parseFloat(values[tempCIdx]),
        position: parseInt(values[positionIdx]),
        hfr: parseFloat(values[hfrIdx]),
        exposure_s: exposureSIdx >= 0 ? parseFloat(values[exposureSIdx]) : 5.0,
      });
    }
  }

  return samples;
}

async function fitAndSave() {
  console.log("Fitting focus profiles from samples...");

  const filePath = process.argv[2] || "server/seed/focus_samples.csv";
  const samples = parseCSV(filePath);

  console.log(`Parsed ${samples.length} focus samples`);

  // Group by train_id and filter
  const groups = new Map<string, FocusSampleData[]>();
  for (const sample of samples) {
    const key = `${sample.train_id}:${sample.filter}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(sample);
  }

  for (const [key, groupSamples] of groups) {
    const [trainId, filter] = key.split(":");
    
    // Insert samples into database
    for (const sample of groupSamples) {
      try {
        await db.insert(focusSample).values({
          trainId: sample.train_id,
          ts: new Date(sample.ts),
          filter: sample.filter,
          tempC: sample.temp_c,
          position: sample.position,
          hfr: sample.hfr,
          exposureS: sample.exposure_s,
          starCount: 10, // Default
        }).onConflictDoNothing();
      } catch (error: any) {
        // Ignore duplicates
      }
    }

    // Fit V-curve
    const fitData = groupSamples.map(s => ({ position: s.position, hfr: s.hfr }));
    const fit = fitVCurve(fitData);

    // Insert/update focus profile
    await db.insert(focusProfile).values({
      trainId,
      filter,
      model: fit.model,
      r2: fit.r2,
    }).onConflictDoUpdate({
      target: [focusProfile.trainId, focusProfile.filter],
      set: {
        model: fit.model,
        r2: fit.r2,
        updatedAt: new Date(),
      },
    });

    console.log(`✓ Fitted profile for ${filter}: optimal=${fit.optimalPos}, r²=${fit.r2.toFixed(3)}`);
  }

  console.log(`✅ Fitted ${groups.size} focus profiles`);
  await pool.end();
}

fitAndSave().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
