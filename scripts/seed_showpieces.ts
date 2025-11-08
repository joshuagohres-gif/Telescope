#!/usr/bin/env tsx
/**
 * Seed Catalog Showpieces
 * 
 * Imports showpiece objects from JSON into the catalog.object table.
 */

import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { catalogObject } from "../shared/astrodb-schema";
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

interface Showpiece {
  name: string;
  class: string;
  ra_j2000_deg: number;
  dec_j2000_deg: number;
  mag: number;
  source?: string;
}

async function seedShowpieces() {
  console.log("Seeding catalog showpieces...");

  const filePath = process.argv[2] || "server/seed/catalog_showpieces.json";
  const content = readFileSync(filePath, "utf-8");
  const showpieces: Showpiece[] = JSON.parse(content);

  console.log(`Found ${showpieces.length} showpieces to import`);

  for (const obj of showpieces) {
    try {
      await db.insert(catalogObject).values({
        primaryName: obj.name,
        catalogIds: {},
        class: obj.class as any,
        raJ2000Deg: obj.ra_j2000_deg.toString(),
        decJ2000Deg: obj.dec_j2000_deg.toString(),
        mag: obj.mag,
        notes: obj.source ? `Source: ${obj.source}` : undefined,
      }).onConflictDoUpdate({
        target: [catalogObject.primaryName],
        set: {
          class: obj.class as any,
          raJ2000Deg: obj.ra_j2000_deg.toString(),
          decJ2000Deg: obj.dec_j2000_deg.toString(),
          mag: obj.mag,
        },
      });
      console.log(`✓ Imported ${obj.name}`);
    } catch (error: any) {
      console.error(`Error importing ${obj.name}:`, error.message);
    }
  }

  console.log(`✅ Imported ${showpieces.length} showpieces`);
  await pool.end();
}

seedShowpieces().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
