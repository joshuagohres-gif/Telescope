import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import pg from "pg";
import ws from "ws";

// Configure neon to use ws for WebSocket
neonConfig.webSocketConstructor = ws as any;

// Create database connection
// If no DATABASE_URL is provided, this will be null and storage classes will handle it
let db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzleNode> | null = null;

if (process.env.DATABASE_URL) {
  const databaseUrl = process.env.DATABASE_URL;
  const isNeonDatabase = databaseUrl.includes('neon.tech') || databaseUrl.includes('.neon.');

  if (isNeonDatabase) {
    // Use Neon serverless driver for Neon databases
    const pool = new NeonPool({ connectionString: databaseUrl });
    db = drizzleNeon(pool);
  } else {
    // Use standard PostgreSQL driver for local databases
    const { Pool } = pg;
    const pool = new Pool({ connectionString: databaseUrl });
    db = drizzleNode(pool);
  }
}

export { db };
