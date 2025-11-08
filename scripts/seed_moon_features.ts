#!/usr/bin/env tsx
/**
 * Seed Moon Features
 * 
 * Imports lunar features from JSON into targets.feature table.
 */

import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { feature } from "../shared/targets-schema";
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

interface MoonFeature {
  body: string;
  name: string;
  lat_deg: number;
  lon_deg: number;
  diameter_km: number;
  type: string;
  source?: string;
}

async function seedMoonFeatures() {
  console.log("Seeding moon features...");

  const filePath = process.argv[2] || "server/seed/moon_features.json";
  const content = readFileSync(filePath, "utf-8");
  const features: MoonFeature[] = JSON.parse(content);

  console.log(`Found ${features.length} features to import`);

  for (const feat of features) {
    try {
      await db.insert(feature).values({
        body: feat.body.toLowerCase() as any,
        name: feat.name,
        featureType: feat.type as any,
        lat: feat.lat_deg,
        lon: feat.lon_deg,
        diameter: feat.diameter_km,
        description: feat.source ? `Source: ${feat.source}` : undefined,
      }).onConflictDoUpdate({
        target: [feature.body, feature.name],
        set: {
          featureType: feat.type as any,
          lat: feat.lat_deg,
          lon: feat.lon_deg,
          diameter: feat.diameter_km,
        },
      });
      console.log(`✓ Imported ${feat.name}`);
    } catch (error: any) {
      console.error(`Error importing ${feat.name}:`, error.message);
    }
  }

  console.log(`✅ Imported ${features.length} moon features`);
  await pool.end();
}

seedMoonFeatures().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
