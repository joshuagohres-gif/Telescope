#!/usr/bin/env tsx
/**
 * Import Submetrics
 * 
 * Imports session submetrics from CSV into the database.
 */

import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { submetric } from "../shared/planqa-schema";
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

interface SubmetricData {
  session_id: string;
  frame_no: number;
  ts: string;
  hfr: number;
  ecc: number;
  sky_adu: number;
  rms_ra?: number | null;
  rms_dec?: number | null;
  reject: boolean;
}

function parseArgs(): { sessionId: string; file: string } {
  const args = process.argv.slice(2);
  let sessionId: string | undefined;
  let file: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--session-id" && i + 1 < args.length) {
      sessionId = args[i + 1];
      i++;
    } else if (args[i] === "--file" && i + 1 < args.length) {
      file = args[i + 1];
      i++;
    }
  }

  if (!sessionId || !file) {
    console.error("Usage: tsx scripts/submetrics_import.ts --session-id <uuid> --file <csv-file>");
    process.exit(1);
  }

  return { sessionId, file };
}

function parseCSV(filePath: string): SubmetricData[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  
  if (lines.length < 2) {
    throw new Error("CSV file must have at least a header and one data row");
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const sessionIdIdx = header.indexOf("session_id");
  const frameNoIdx = header.indexOf("frame_no");
  const tsIdx = header.indexOf("ts");
  const hfrIdx = header.indexOf("hfr");
  const eccIdx = header.indexOf("ecc");
  const skyAduIdx = header.indexOf("sky_adu");
  const rmsRaIdx = header.indexOf("rms_ra");
  const rmsDecIdx = header.indexOf("rms_dec");
  const rejectIdx = header.indexOf("reject");

  if (frameNoIdx === -1 || tsIdx === -1 || hfrIdx === -1 || eccIdx === -1 || skyAduIdx === -1) {
    throw new Error("CSV must have required columns: frame_no, ts, hfr, ecc, sky_adu");
  }

  const metrics: SubmetricData[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length > Math.max(frameNoIdx, tsIdx, hfrIdx, eccIdx, skyAduIdx)) {
      metrics.push({
        session_id: sessionIdIdx >= 0 ? values[sessionIdIdx] : "",
        frame_no: parseInt(values[frameNoIdx]),
        ts: values[tsIdx],
        hfr: parseFloat(values[hfrIdx]),
        ecc: parseFloat(values[eccIdx]),
        sky_adu: parseFloat(values[skyAduIdx]),
        rms_ra: rmsRaIdx >= 0 && values[rmsRaIdx] ? parseFloat(values[rmsRaIdx]) : null,
        rms_dec: rmsDecIdx >= 0 && values[rmsDecIdx] ? parseFloat(values[rmsDecIdx]) : null,
        reject: rejectIdx >= 0 ? values[rejectIdx].toLowerCase() === "true" : false,
      });
    }
  }

  return metrics;
}

async function importSubmetrics(sessionId: string, filePath: string) {
  console.log(`Importing submetrics for session ${sessionId} from ${filePath}...`);

  const metrics = parseCSV(filePath);
  console.log(`Parsed ${metrics.length} submetrics from CSV`);

  for (const metric of metrics) {
    try {
      await db.insert(submetric).values({
        sessionId: sessionId, // Use provided session ID, not from CSV
        frameNo: metric.frame_no,
        ts: new Date(metric.ts),
        hfr: metric.hfr,
        ecc: metric.ecc,
        skyAdu: metric.sky_adu,
        rmsRa: metric.rms_ra,
        rmsDec: metric.rms_dec,
        reject: metric.reject,
      }).onConflictDoNothing();
    } catch (error: any) {
      console.error(`Error importing frame ${metric.frame_no}:`, error.message);
    }
  }

  console.log(`✅ Imported ${metrics.length} submetrics`);
  await pool.end();
}

async function main() {
  const { sessionId, file } = parseArgs();
  await importSubmetrics(sessionId, file);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
