#!/usr/bin/env tsx
/**
 * Seed Exposure Recipes
 * 
 * Imports rule-based exposure recipes from JSON into the database.
 */

import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { recipe } from "../shared/planqa-schema";
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

interface RecipeData {
  train_id?: string | null;
  target_class: string;
  sky_mpsas_bin: string;
  filter: string;
  sub_exposure_s: number;
  subs: number;
  dither_pix?: number | null;
  bin?: number | null;
  gain?: string | null;
  iso?: string | null;
  rationale_md: string;
}

async function seedRecipes() {
  console.log("Seeding exposure recipes...");

  const filePath = process.argv[2] || "server/seed/recipes.json";
  const content = readFileSync(filePath, "utf-8");
  const recipes: RecipeData[] = JSON.parse(content);

  console.log(`Found ${recipes.length} recipes to import`);

  for (const rec of recipes) {
    try {
      await db.insert(recipe).values({
        trainId: rec.train_id || null,
        targetClass: rec.target_class,
        skyMpsasBin: rec.sky_mpsas_bin,
        filter: rec.filter,
        subExposureS: rec.sub_exposure_s,
        subs: rec.subs,
        ditherPix: rec.dither_pix || null,
        bin: rec.bin || null,
        gain: rec.gain || null,
        iso: rec.iso || null,
        rationaleMd: rec.rationale_md,
      }).onConflictDoNothing();
      console.log(`✓ Imported recipe: ${rec.target_class} ${rec.filter} ${rec.sky_mpsas_bin}`);
    } catch (error: any) {
      console.error(`Error importing recipe:`, error.message);
    }
  }

  console.log(`✅ Imported ${recipes.length} recipes`);
  await pool.end();
}

seedRecipes().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
