import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Configure neon to use ws for WebSocket
neonConfig.webSocketConstructor = ws as any;

// Create database connection
// If no DATABASE_URL is provided, this will be null and storage classes will handle it
let db: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool);
}

export { db };
