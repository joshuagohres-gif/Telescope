import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { celestialTargets, type InsertCelestialTarget } from "@shared/schema";
import ws from "ws";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, webSocketConstructor: ws as any });
const db = drizzle(pool);

const initialTargets: InsertCelestialTarget[] = [
  // Planets
  { name: "Mars", type: "planet", ra: 1.5, dec: 15.0, magnitude: -2.0, constellation: "Aries", description: "The Red Planet" },
  { name: "Jupiter", type: "planet", ra: 3.2, dec: 17.5, magnitude: -2.5, constellation: "Taurus", description: "Gas giant with Great Red Spot" },
  { name: "Saturn", type: "planet", ra: 14.5, dec: -12.0, magnitude: 0.5, constellation: "Virgo", description: "The Ringed Planet" },
  { name: "Venus", type: "planet", ra: 22.0, dec: -10.0, magnitude: -4.0, constellation: "Aquarius", description: "Evening Star" },
  
  // Deep Sky Objects
  { name: "Andromeda Galaxy", type: "galaxy", ra: 0.71, dec: 41.27, magnitude: 3.4, constellation: "Andromeda", description: "M31, nearest major galaxy" },
  { name: "Orion Nebula", type: "nebula", ra: 5.59, dec: -5.39, magnitude: 4.0, constellation: "Orion", description: "M42, stellar nursery" },
  { name: "Pleiades", type: "cluster", ra: 3.79, dec: 24.12, magnitude: 1.6, constellation: "Taurus", description: "M45, Seven Sisters" },
  { name: "Whirlpool Galaxy", type: "galaxy", ra: 13.5, dec: 47.2, magnitude: 8.4, constellation: "Canes Venatici", description: "M51, interacting galaxies" },
  { name: "Ring Nebula", type: "nebula", ra: 18.89, dec: 33.03, magnitude: 8.8, constellation: "Lyra", description: "M57, planetary nebula" },
  { name: "Hercules Cluster", type: "cluster", ra: 16.69, dec: 36.46, magnitude: 5.8, constellation: "Hercules", description: "M13, globular cluster" },
  
  // Bright Stars
  { name: "Sirius", type: "star", ra: 6.75, dec: -16.72, magnitude: -1.46, constellation: "Canis Major", description: "Brightest star in the night sky" },
  { name: "Vega", type: "star", ra: 18.62, dec: 38.78, magnitude: 0.03, constellation: "Lyra", description: "Summer Triangle star" },
  { name: "Betelgeuse", type: "star", ra: 5.92, dec: 7.41, magnitude: 0.5, constellation: "Orion", description: "Red supergiant" },
  { name: "Polaris", type: "star", ra: 2.53, dec: 89.26, magnitude: 1.98, constellation: "Ursa Minor", description: "North Star" },
];

async function seed() {
  console.log("Seeding celestial targets database...");
  
  try {
    for (const target of initialTargets) {
      await db.insert(celestialTargets).values(target).onConflictDoNothing();
    }
    console.log(`Successfully seeded ${initialTargets.length} celestial targets`);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
