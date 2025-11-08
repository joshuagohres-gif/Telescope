#!/usr/bin/env tsx
/**
 * Horizon CSV Import Script
 * 
 * Imports horizon altitude limits from a CSV file into the database.
 * 
 * CSV Format:
 *   az_deg,alt_limit_deg
 *   0,15.2
 *   15,16.8
 *   ...
 * 
 * Usage:
 *   tsx scripts/horizon_import.ts --site-id <uuid> --file horizon.csv
 */

import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { horizon } from "../shared/ops-schema";
import { eq } from "drizzle-orm";
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

interface HorizonPoint {
  azDeg: number;
  altLimitDeg: number;
}

function parseArgs(): { siteId: string; file: string } {
  const args = process.argv.slice(2);
  let siteId: string | undefined;
  let file: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--site-id" && i + 1 < args.length) {
      siteId = args[i + 1];
      i++;
    } else if (args[i] === "--file" && i + 1 < args.length) {
      file = args[i + 1];
      i++;
    }
  }

  if (!siteId || !file) {
    console.error("Usage: tsx scripts/horizon_import.ts --site-id <uuid> --file <csv-file>");
    process.exit(1);
  }

  return { siteId, file };
}

function parseCSV(filePath: string): HorizonPoint[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    
    if (lines.length < 2) {
      throw new Error("CSV file must have at least a header and one data row");
    }

    // Parse header
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const azIdx = header.indexOf("az_deg");
    const altIdx = header.indexOf("alt_limit_deg");

    if (azIdx === -1 || altIdx === -1) {
      throw new Error("CSV must have 'az_deg' and 'alt_limit_deg' columns");
    }

    // Parse data rows
    const points: HorizonPoint[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length > Math.max(azIdx, altIdx)) {
        points.push({
          azDeg: parseFloat(values[azIdx]),
          altLimitDeg: parseFloat(values[altIdx]),
        });
      }
    }

    return points;
  } catch (error: any) {
    console.error(`Error reading CSV file: ${error.message}`);
    process.exit(1);
  }
}

async function importHorizon(siteId: string, points: HorizonPoint[]) {
  try {
    // Delete existing horizon data for this site
    await db.delete(horizon).where(eq(horizon.siteId, siteId));
    console.log(`Deleted existing horizon data for site ${siteId}`);

    // Insert new points
    if (points.length > 0) {
      await db.insert(horizon).values(
        points.map((p) => ({
          siteId,
          azDeg: p.azDeg,
          altLimitDeg: p.altLimitDeg,
          source: "csv_import",
        }))
      );
      console.log(`✓ Imported ${points.length} horizon points for site ${siteId}`);
    } else {
      console.warn("No points to import");
    }
  } catch (error: any) {
    console.error(`Error importing horizon data: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  const { siteId, file } = parseArgs();
  console.log(`Importing horizon data for site ${siteId} from ${file}...`);

  const points = parseCSV(file);
  console.log(`Parsed ${points.length} points from CSV`);

  // Validate points
  for (const p of points) {
    if (isNaN(p.azDeg) || isNaN(p.altLimitDeg)) {
      console.error(`Invalid point: az_deg=${p.azDeg}, alt_limit_deg=${p.altLimitDeg}`);
      process.exit(1);
    }
    if (p.azDeg < 0 || p.azDeg >= 360) {
      console.warn(`Warning: az_deg ${p.azDeg} is outside 0-360 range, will be normalized`);
    }
    if (p.altLimitDeg < 0 || p.altLimitDeg > 90) {
      console.warn(`Warning: alt_limit_deg ${p.altLimitDeg} is outside 0-90 range`);
    }
  }

  await importHorizon(siteId, points);
  console.log("✅ Import complete!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
